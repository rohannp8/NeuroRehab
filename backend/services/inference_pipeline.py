import time
import base64
import cv2
import numpy as np
import sys
import os
from collections import deque

model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "model"))
if model_dir not in sys.path:
    sys.path.insert(0, model_dir)

from ml_core.model_loader import model_loader
import importlib

try:
    m01 = importlib.import_module("01_blazepose")
    m02 = importlib.import_module("02_kalman")
    m04 = importlib.import_module("03_anomaly")
    m08 = importlib.import_module("m08_multilingual_translato")
    from m05_random_forest_classifier import M05RandomForestClassifier
    from digital_twin_gru import DigitalTwinGRU
    from m06_lstm_cognitive_scorer import M06LSTMCognitiveScorer
    from m12_facial_engagement_detector import M12FacialDetector
except Exception:
    m01 = m02 = m04 = m08 = None
    M05RandomForestClassifier = DigitalTwinGRU = M06LSTMCognitiveScorer = M12FacialDetector = None

class RealtimePipeline:
    def __init__(self):
        # M05
        _rf = model_loader.get_model("rf_exercise")
        self.rf_classifier = M05RandomForestClassifier(_rf) if M05RandomForestClassifier else None
        
        # M04
        _iforest = model_loader.get_model("isolation_forest")
        self.form_checker = m04.FormChecker(_iforest) if m04 and isinstance(_iforest, dict) else None
            
        # M02 Twin
        _gru = model_loader.get_model("gru")
        self.dt_gru = DigitalTwinGRU(_gru) if DigitalTwinGRU else None

        # M06 LSTM
        _lstm = model_loader.get_model("lstm")
        self.cognitive_scorer = M06LSTMCognitiveScorer(_lstm) if M06LSTMCognitiveScorer else None
        
        # M12 Face
        self.facial_detector = M12FacialDetector() if M12FacialDetector else None
        
        # M08 Translator
        self.translator = m08.M08MBartTranslator() if m08 else None

        # M02 Smoother
        self.smoother = m02.LandmarkSmoother() if m02 else None

    def process_frame(self, frame_b64: str, session_context: dict) -> dict:
        start_time = time.time()
        
        if "history" not in session_context:
            session_context["history"] = deque(maxlen=30)
            session_context["deviations"] = deque(maxlen=30)
            session_context["frame_count"] = 0
            session_context["facial_data"] = {"engagement": 0.85, "pain": 0.0, "emotion": "neutral"}
            session_context["last_audio_time"] = 0.0
            
        session_context["frame_count"] += 1
        frame_img = self._decode_base64_frame(frame_b64)
        if frame_img is None:
            return {"error": "Invalid frame"}

        # M12 Throttle
        if self.facial_detector and session_context["frame_count"] % 15 == 0:
            session_context["facial_data"] = self.facial_detector.analyze_face(frame_img)

        # M01 -> M02 -> M05
        pose_data = m01.get_landmarks(frame_img, int(time.time() * 1000)) if m01 else {"detected": False}
        smoothed_data = self.smoother.smooth(pose_data) if (self.smoother and pose_data.get("detected")) else pose_data
            
        joint_angles = smoothed_data.get("joint_angles", {})
        hand_landmarks = smoothed_data.get("hand_landmarks_px", [])

        if pose_data.get("detected"):
            session_context["history"].append(joint_angles)

        exercise, conf = "Searching...", 0.0
        if self.rf_classifier and pose_data.get("detected"):
            exercise, conf = self.rf_classifier.predict(joint_angles)
        
        # M02 Twin & M04 Anomaly
        predicted_rom, fatigue, target_angle = 85.0, 10.0, 90.0
        if self.dt_gru:
            predicted_rom, fatigue, target_angle = self.dt_gru.predict(list(session_context["history"]))
            
        is_correct_form, anomaly_score = True, 1.0
        if self.form_checker and pose_data.get("detected"):
            try:
                is_correct_form = self.form_checker.check_form(joint_angles, hand_landmarks)
                anomaly_score = self.form_checker.anomaly_score(joint_angles, hand_landmarks)
            except Exception: pass
        
        deviation = abs((joint_angles.get("left_knee", 0) or 0) - target_angle)
        if pose_data.get("detected"):
            session_context["deviations"].append(deviation)
            
        # M06 Logic
        cognitive_data = self.cognitive_scorer.predict(list(session_context["deviations"])) if self.cognitive_scorer else {"score": 85.0, "trend": "Baseline"}

        # Text Rules Output + Async Audio Voice Triggers
        target_lang = session_context.get("lang_code", "en")
        feedback, audio_trigger = self._generate_feedback(
            is_correct_form, anomaly_score, deviation, fatigue, session_context["facial_data"], session_context, target_lang
        )

        # M08 Text Translation applied visually to textual UI feedback msg if needed
        if self.translator and target_lang != "en":
            feedback["message"] = self.translator.translate(feedback["message"], src_lang="en_XX", tgt_lang=f"{target_lang}_IN")

        latency_ms = int((time.time() - start_time) * 1000)
        
        return {
            "landmarks": smoothed_data.get("landmarks_raw", []),
            "landmarks_px": smoothed_data.get("landmarks_px", []),
            "exercise": exercise,
            "confidence": conf,
            "rep_count": session_context.get("rep_count", 0),
            "feedback": feedback,
            "audio_trigger": audio_trigger,
            "digital_twin": {
                "predicted_rom": round(predicted_rom, 2),
                "fatigue_score": round(fatigue, 2),
                "target_angle": target_angle,
                "deviation_score": round(deviation, 2)
            },
            "cognitive_engagement": {
                "cognitive_lstm": cognitive_data,
                "face_m12": session_context["facial_data"]
            },
            "form": {
                "is_correct": is_correct_form,
                "anomaly_score": round(anomaly_score, 3) if anomaly_score else None
            },
            "metrics": {
                "latency_ms": latency_ms
            }
        }
        
    def _decode_base64_frame(self, b64_str: str):
        try:
            b64_str = b64_str.split(",")[1] if "," in b64_str else b64_str
            return cv2.imdecode(np.frombuffer(base64.b64decode(b64_str), np.uint8), cv2.IMREAD_COLOR)
        except Exception: return None
        
    def _generate_feedback(self, is_correct, anomaly_score, deviation, fatigue, facial_data, ctx, lang):
        current_time = time.time()
        # Cooldown check: generate audio at most once every 5 seconds to avoid overlapping spoken rules
        can_speak = (current_time - ctx["last_audio_time"]) > 5.0
        audio_trigger = None
        
        status, color, msg, phrase_key = "correct", "green", "Excellent execution!", "good_form"
        
        if facial_data.get("pain", 0.0) > 0.5:
             status, color, msg, phrase_key = "warning", "red", "You look like you're in pain. Please stop or rest immediately.", "take_rest"
        elif fatigue > 80.0:
            status, color, msg, phrase_key = "warning", "yellow", "High fatigue detected, take a rest.", "take_rest"
        elif not is_correct:
            status, color, msg, phrase_key = "incorrect", "red", "Adjust your posture.", "bad_form"
        elif deviation > 20.0:
            status, color, msg, phrase_key = "warning", "yellow", "Try to reach closer to the target angle.", "bend_joint"
            
        if can_speak and status != "correct": # only speak corrections and limits
            audio_trigger = {"phrase_key": phrase_key, "lang": lang}
            ctx["last_audio_time"] = current_time

        return {"status": status, "color": color, "message": msg}, audio_trigger

pipeline_instance = RealtimePipeline()
