"""
Real-time ML inference pipeline for pose analysis and exercise feedback.
Processes video frames through multiple ML models for comprehensive rehabilitation metrics.
"""

import time
import math
import base64
import logging
import cv2
import numpy as np
import sys
import os
from collections import deque
from typing import Dict, Tuple, Any

# Setup path for model imports
model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "model"))
if model_dir not in sys.path:
    sys.path.insert(0, model_dir)

# Import model loader and utilities
from ml_core.model_loader import model_loader
from utils import FeatureEngineer, compute_joint_angles, validate_pose_data
import importlib

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Safely import ML models with individual error handling
m01 = None
m02 = None
m04 = None
m08 = None
M05RandomForestClassifier = None
DigitalTwinGRU = None
M06LSTMCognitiveScorer = None
M12FacialDetector = None

try:
    m01 = importlib.import_module("01_blazepose")
except Exception as e:
    logger.warning(f"⚠️  BlazePose (M01) import failed: {e}")

try:
    m02 = importlib.import_module("02_kalman")
except Exception as e:
    logger.warning(f"⚠️  Kalman Smoother (M02) import failed: {e}")

try:
    m04 = importlib.import_module("03_anomaly")
except Exception as e:
    logger.warning(f"⚠️  Anomaly Detector (M03) import failed: {e}")

try:
    m08 = importlib.import_module("m08_multilingual_translato")
except Exception as e:
    logger.warning(f"⚠️  Translator (M08) import failed: {e}")

try:
    from m05_random_forest_classifier import M05RandomForestClassifier
except Exception as e:
    logger.warning(f"⚠️  Random Forest Classifier (M05) import failed: {e}")

try:
    from digital_twin_gru import DigitalTwinGRU
except Exception as e:
    logger.warning(f"⚠️  Digital Twin GRU (M02 Twin) import failed: {e}")

try:
    from m06_lstm_cognitive_scorer import M06LSTMCognitiveScorer
except Exception as e:
    logger.warning(f"⚠️  LSTM Cognitive Scorer (M06) import failed: {e}")

try:
    from m12_facial_engagement_detector import M12FacialDetector
except Exception as e:
    logger.warning(f"⚠️  Facial Detector (M12) import failed: {e}")


class RealtimePipeline:
    """
    Production-grade real-time ML pipeline for pose analysis.
    Handles all 12 ML models in strict sequence with error recovery.
    """
    
    def __init__(self):
        """Initialize all ML models with graceful degradation."""
        logger.info("\n" + "=" * 70)
        logger.info("🚀 INITIALIZING REALTIME INFERENCE PIPELINE")
        logger.info("=" * 70)
        
        start_init = time.time()
        
        # M05 - Exercise Classification
        try:
            _rf = model_loader.get_model("rf_exercise")
            self.rf_classifier = M05RandomForestClassifier(_rf) if M05RandomForestClassifier and _rf else None
            if self.rf_classifier:
                logger.info("✅ M05 Random Forest Classifier: READY")
            else:
                logger.warning("⚠️  M05 Random Forest Classifier: DEGRADED (will use defaults)")
        except Exception as e:
            logger.error(f"❌ M05 initialization error: {e}")
            self.rf_classifier = None
        
        # M04 - Form/Anomaly Detection
        try:
            _iforest = model_loader.get_model("isolation_forest")
            if m04 and _iforest and not isinstance(_iforest, str):
                self.form_checker = m04.FormChecker(_iforest)
                logger.info("✅ M04 Isolation Forest Form Checker: READY")
            else:
                self.form_checker = None
                logger.warning("⚠️  M04 Isolation Forest Form Checker: DEGRADED")
        except Exception as e:
            logger.error(f"❌ M04 initialization error: {e}")
            self.form_checker = None
        
        # M02 Digital Twin GRU
        try:
            _gru = model_loader.get_model("gru")
            self.dt_gru = DigitalTwinGRU(_gru) if DigitalTwinGRU and _gru else None
            if self.dt_gru:
                logger.info("✅ M02 Digital Twin GRU: READY")
            else:
                logger.warning("⚠️  M02 Digital Twin GRU: DEGRADED")
        except Exception as e:
            logger.error(f"❌ M02 GRU initialization error: {e}")
            self.dt_gru = None
        
        # M06 LSTM Cognitive Scorer
        try:
            _lstm = model_loader.get_model("lstm")
            self.cognitive_scorer = M06LSTMCognitiveScorer(_lstm) if M06LSTMCognitiveScorer and _lstm else None
            if self.cognitive_scorer:
                logger.info("✅ M06 LSTM Cognitive Scorer: READY")
            else:
                logger.warning("⚠️  M06 LSTM Cognitive Scorer: DEGRADED")
        except Exception as e:
            logger.error(f"❌ M06 LSTM initialization error: {e}")
            self.cognitive_scorer = None
        
        # M12 Facial Engagement Detector
        try:
            self.facial_detector = M12FacialDetector() if M12FacialDetector else None
            if self.facial_detector:
                logger.info("✅ M12 Facial Engagement Detector: READY")
            else:
                logger.warning("⚠️  M12 Facial Engagement Detector: DEGRADED")
        except Exception as e:
            logger.error(f"❌ M12 Facial Detector initialization error: {e}")
            self.facial_detector = None
        
        # M08 Translator
        try:
            self.translator = m08.M08MBartTranslator() if m08 else None
            if self.translator:
                logger.info("✅ M08 Multilingual Translator: READY")
            else:
                logger.warning("⚠️  M08 Multilingual Translator: DEGRADED")
        except Exception as e:
            logger.error(f"❌ M08 Translator initialization error: {e}")
            self.translator = None
        
        # M02 Kalman Smoothing
        try:
            self.smoother = m02.LandmarkSmoother() if m02 else None
            if self.smoother:
                logger.info("✅ M02 Kalman Filter Smoothing: READY")
            else:
                logger.warning("⚠️  M02 Kalman Filter Smoothing: DEGRADED")
        except Exception as e:
            logger.error(f"❌ M02 Kalman initialization error: {e}")
            self.smoother = None
        
        # Feature Engineer
        try:
            self.feature_engineer = FeatureEngineer(window_size=5)
            logger.info("✅ Feature Engineer: READY")
        except Exception as e:
            logger.error(f"❌ Feature Engineer initialization error: {e}")
            self.feature_engineer = None
        
        init_time = time.time() - start_init
        logger.info(f"\n✅ Pipeline initialization complete ({init_time:.2f}s)")
        logger.info("=" * 70 + "\n")

    def process_frame(self, frame_b64: str, session_context: Dict) -> Dict:
        """Main inference loop - process a single frame through entire pipeline."""
        start_time = time.time()
        
        # Initialize session context
        if "history" not in session_context:
            session_context["history"] = deque(maxlen=30)
            session_context["deviations"] = deque(maxlen=30)
            session_context["frame_count"] = 0
            session_context["rep_count"] = 0
            session_context["facial_data"] = {
                "engagement": 0.85,
                "pain": 0.0,
                "emotion": "neutral"
            }
            session_context["last_audio_time"] = 0.0
            session_context["rep_tracker"] = {
                "phase": "down",
                "hit_top": False,
                "last_angle": None,
                "last_session_id": session_context.get("session_id", "temp_uid"),
                "last_exercise_name": session_context.get("exercise_name", ""),
            }
        
        session_context["frame_count"] += 1
        
        # STEP 1: Decode frame
        try:
            frame_img = self._decode_base64_frame(frame_b64)
            if frame_img is None:
                return self._safe_default_response(session_context)
        except Exception as e:
            logger.error(f"Frame decoding error: {e}")
            return self._safe_default_response(session_context)
        
        # STEP 2: Facial detection (M12) - throttled to every 15 frames
        try:
            if self.facial_detector and session_context["frame_count"] % 15 == 0:
                session_context["facial_data"] = self.facial_detector.analyze_face(frame_img)
        except Exception as e:
            logger.debug(f"M12 Facial analysis error: {e}")
        
        # STEP 3: Pose detection (M01)
        try:
            pose_data = m01.get_landmarks(frame_img, int(time.time() * 1000)) if m01 else {"detected": False}
            if not pose_data.get("detected"):
                return self._safe_default_response(session_context)
        except Exception as e:
            logger.error(f"M01 Pose detection error: {e}")
            return self._safe_default_response(session_context)
        
        landmarks_raw = pose_data.get("landmarks_raw", [])
        
        # STEP 4: Smoothing (M02)
        try:
            if self.smoother and pose_data.get("detected"):
                smoothed_data = self.smoother.smooth(pose_data)
            else:
                smoothed_data = pose_data
        except Exception as e:
            logger.debug(f"M02 Smoothing error: {e}")
            smoothed_data = pose_data
        
        # STEP 5: Feature extraction
        try:
            joint_angles = compute_joint_angles(landmarks_raw)
            session_context["history"].append(joint_angles)
            hand_landmarks = smoothed_data.get("hand_landmarks_px", [])
        except Exception as e:
            logger.error(f"Feature extraction error: {e}")
            joint_angles = {}
            hand_landmarks = []
        
        # STEP 6: Exercise classification (M05)
        exercise = "Searching..."
        confidence = 0.0
        try:
            if self.rf_classifier and pose_data.get("detected") and joint_angles:
                exercise, confidence = self.rf_classifier.predict(joint_angles)
        except Exception as e:
            logger.debug(f"M05 Classification error: {e}")
        
        # STEP 7: Digital Twin & ROM prediction (M02 GRU)
        predicted_rom = 85.0
        fatigue = 10.0
        target_angle = 90.0
        try:
            if self.dt_gru and len(session_context["history"]) > 0:
                predicted_rom, fatigue, target_angle = self.dt_gru.predict(
                    list(session_context["history"])
                )
        except Exception as e:
            logger.debug(f"M02 GRU prediction error: {e}")
        
        # STEP 8: Form validation (M04)
        is_correct_form = True
        anomaly_score = 0.0
        try:
            if self.form_checker and pose_data.get("detected"):
                is_correct_form = self.form_checker.check_form(joint_angles, hand_landmarks)
                anomaly_score = self.form_checker.anomaly_score(joint_angles, hand_landmarks)
        except Exception as e:
            logger.debug(f"M04 Form checking error: {e}")
        
        # STEP 9: Compute deviation
        try:
            deviation = abs(joint_angles.get("left_knee", target_angle) - target_angle)
            if pose_data.get("detected"):
                session_context["deviations"].append(deviation)
        except Exception as e:
            logger.debug(f"Deviation calculation error: {e}")
            deviation = 0.0
        
        # STEP 10: Cognitive engagement (M06)
        cognitive_data = {"score": 85.0, "trend": "Baseline"}
        try:
            if self.cognitive_scorer and len(session_context["deviations"]) > 0:
                cognitive_data = self.cognitive_scorer.predict(
                    list(session_context["deviations"])
                )
        except Exception as e:
            logger.debug(f"M06 Cognitive scoring error: {e}")

        # STEP 10.5: Rep counting
        try:
            self._update_rep_count(joint_angles, hand_landmarks, session_context)
        except Exception as e:
            logger.debug(f"Rep counting error: {e}")
        
        # STEP 11: Generate feedback
        target_lang = session_context.get("lang_code", "en")
        feedback, audio_trigger = self._generate_feedback(
            is_correct_form,
            anomaly_score,
            deviation,
            fatigue,
            session_context["facial_data"],
            session_context,
            target_lang
        )
        
        # STEP 12: Translation (M08)
        try:
            if self.translator and target_lang != "en":
                feedback["message"] = self.translator.translate(
                    feedback["message"],
                    src_lang="en_XX",
                    tgt_lang=f"{target_lang}_IN"
                )
        except Exception as e:
            logger.debug(f"M08 Translation error: {e}")
        
        # Assemble response
        latency_ms = int((time.time() - start_time) * 1000)
        
        result = {
            "landmarks_px": landmarks_raw,
            "exercise": exercise,
            "confidence": float(confidence),
            "rep_count": session_context.get("rep_count", 0),
            "feedback": feedback,
            "digital_twin": {
                "predicted_rom": round(float(predicted_rom), 2),
                "fatigue_score": round(float(fatigue), 2),
                "target_angle": round(float(target_angle), 2),
                "deviation_score": round(float(deviation), 2)
            },
            "cognitive_engagement": {
                "cognitive_lstm": cognitive_data,
                "face_m12": session_context["facial_data"]
            },
            "form": {
                "is_correct": bool(is_correct_form),
                "anomaly_score": round(float(anomaly_score), 3) if isinstance(anomaly_score, (int, float)) else None
            },
            "metrics": {
                "latency_ms": latency_ms,
                "frame_num": session_context["frame_count"]
            }
        }
        
        if audio_trigger:
            result["audio_trigger"] = audio_trigger
        
        if latency_ms > 100:
            logger.warning(f"⚠️  High latency: {latency_ms}ms (frame #{session_context['frame_count']})")
        
        return result

    def _resolve_primary_angle(self, joint_angles: Dict, ctx: Dict, tracker: Dict | None = None) -> float:
        """Pick the most relevant joint angle based on selected exercise/joint."""
        primary_joint = str(ctx.get("primary_joint", "")).lower()
        exercise_name = str(ctx.get("exercise_name", "")).lower()

        def pair_angle(base_joint: str, default: float = 90.0) -> float:
            left_key = f"left_{base_joint}"
            right_key = f"right_{base_joint}"
            left_val = joint_angles.get(left_key)
            right_val = joint_angles.get(right_key)

            left_ok = isinstance(left_val, (int, float))
            right_ok = isinstance(right_val, (int, float))

            if not left_ok and not right_ok:
                return default
            if left_ok and not right_ok:
                return float(left_val)
            if right_ok and not left_ok:
                return float(right_val)

            if tracker is None:
                return float((float(left_val) + float(right_val)) / 2.0)

            side_stats = tracker.get("side_stats")
            if not isinstance(side_stats, dict):
                side_stats = {
                    "left_min": float(left_val),
                    "left_max": float(left_val),
                    "right_min": float(right_val),
                    "right_max": float(right_val),
                    "active_side": "right",
                }
                tracker["side_stats"] = side_stats

            side_stats["left_min"] = min(float(side_stats.get("left_min", left_val)), float(left_val))
            side_stats["left_max"] = max(float(side_stats.get("left_max", left_val)), float(left_val))
            side_stats["right_min"] = min(float(side_stats.get("right_min", right_val)), float(right_val))
            side_stats["right_max"] = max(float(side_stats.get("right_max", right_val)), float(right_val))

            left_range = float(side_stats["left_max"]) - float(side_stats["left_min"])
            right_range = float(side_stats["right_max"]) - float(side_stats["right_min"])
            prev_active = side_stats.get("active_side", "right")

            if left_range > right_range + 6.0:
                side_stats["active_side"] = "left"
            elif right_range > left_range + 6.0:
                side_stats["active_side"] = "right"
            else:
                side_stats["active_side"] = prev_active

            return float(left_val if side_stats["active_side"] == "left" else right_val)

        if "left" in primary_joint:
            if "shoulder" in primary_joint:
                return float(joint_angles.get("left_shoulder", 90.0))
            if "elbow" in primary_joint:
                return float(joint_angles.get("left_elbow", 90.0))
            if "hip" in primary_joint:
                return float(joint_angles.get("left_hip", 90.0))
            if "knee" in primary_joint:
                return float(joint_angles.get("left_knee", 90.0))
            if "ankle" in primary_joint:
                return float(joint_angles.get("left_ankle", 90.0))
            if "wrist" in primary_joint:
                return float(joint_angles.get("left_wrist", 90.0))

        if "right" in primary_joint:
            if "shoulder" in primary_joint:
                return float(joint_angles.get("right_shoulder", 90.0))
            if "elbow" in primary_joint:
                return float(joint_angles.get("right_elbow", 90.0))
            if "hip" in primary_joint:
                return float(joint_angles.get("right_hip", 90.0))
            if "knee" in primary_joint:
                return float(joint_angles.get("right_knee", 90.0))
            if "ankle" in primary_joint:
                return float(joint_angles.get("right_ankle", 90.0))
            if "wrist" in primary_joint:
                return float(joint_angles.get("right_wrist", 90.0))

        if "shoulder" in primary_joint or "shoulder" in exercise_name:
            return pair_angle("shoulder")
        if "elbow" in primary_joint or "elbow" in exercise_name:
            return pair_angle("elbow")
        if "hip" in primary_joint or "hip" in exercise_name:
            return pair_angle("hip")
        if "knee" in primary_joint or "knee" in exercise_name:
            return pair_angle("knee")
        if "ankle" in primary_joint or "ankle" in exercise_name:
            return pair_angle("ankle")
        if "wrist" in primary_joint or "wrist" in exercise_name:
            return pair_angle("wrist")

        return pair_angle("shoulder")

    def _extract_finger_tap_distance(self, hand_landmarks: Any) -> float:
        """Return minimum thumb-tip to index-tip distance across detected hands."""
        if not hand_landmarks:
            return float("inf")

        min_dist = float("inf")
        for hand in hand_landmarks:
            if not hand or len(hand) <= 8:
                continue

            thumb_tip = hand[4]
            index_tip = hand[8]
            if not thumb_tip or not index_tip:
                continue

            tx, ty = thumb_tip[0], thumb_tip[1]
            ix, iy = index_tip[0], index_tip[1]
            dist = math.hypot(float(tx) - float(ix), float(ty) - float(iy))
            min_dist = min(min_dist, dist)

        return min_dist

    def _extract_wrist_motion_angles(self, hand_landmarks: Any) -> list[float]:
        """Return per-hand palm orientation angles (0-180) from wrist->middle_mcp vectors."""
        if not hand_landmarks:
            return []

        angles: list[float] = []
        for hand in hand_landmarks:
            if not hand or len(hand) <= 9:
                continue

            wrist = hand[0]
            middle_mcp = hand[9]
            if not wrist or not middle_mcp:
                continue

            wx, wy = float(wrist[0]), float(wrist[1])
            mx, my = float(middle_mcp[0]), float(middle_mcp[1])
            dx, dy = (mx - wx), (my - wy)
            if abs(dx) < 1e-6 and abs(dy) < 1e-6:
                continue

            # Palm orientation in image plane; robust proxy for wrist flexion/extension in this setup.
            angle = abs(math.degrees(math.atan2(dy, dx)))
            angles.append(angle)

        return angles

    def _extract_fist_open_ratio(self, hand_landmarks: Any, tracker: Dict) -> float | None:
        """
        Return normalized hand openness ratio for the active hand.
        Higher ratio => open hand, lower ratio => closed fist.
        """
        if not hand_landmarks:
            return None

        ratios: list[float] = []
        for hand in hand_landmarks:
            if not hand or len(hand) <= 20:
                continue

            wrist = hand[0]
            middle_mcp = hand[9]
            if not wrist or not middle_mcp:
                continue

            wx, wy = float(wrist[0]), float(wrist[1])
            mx, my = float(middle_mcp[0]), float(middle_mcp[1])
            palm_size = math.hypot(mx - wx, my - wy)
            if palm_size < 1e-3:
                continue

            tip_ids = [8, 12, 16, 20]
            tip_distances: list[float] = []
            for tip_id in tip_ids:
                tip = hand[tip_id]
                if not tip:
                    continue
                tx, ty = float(tip[0]), float(tip[1])
                tip_distances.append(math.hypot(tx - wx, ty - wy))

            if len(tip_distances) < 3:
                continue

            mean_tip_dist = float(sum(tip_distances) / len(tip_distances))
            ratios.append(mean_tip_dist / palm_size)

        if not ratios:
            return None

        fist_stats = tracker.get("fist_hand_stats")
        if not isinstance(fist_stats, dict):
            fist_stats = {"hands": {}, "active_idx": 0}
            tracker["fist_hand_stats"] = fist_stats

        hands_stats = fist_stats.setdefault("hands", {})
        for idx, ratio in enumerate(ratios):
            h = hands_stats.get(idx)
            if not isinstance(h, dict):
                h = {"min": float(ratio), "max": float(ratio)}
                hands_stats[idx] = h
            h["min"] = min(float(h["min"]), float(ratio))
            h["max"] = max(float(h["max"]), float(ratio))

        def _range(i: int) -> float:
            h = hands_stats.get(i)
            if not isinstance(h, dict):
                return 0.0
            return float(h["max"]) - float(h["min"])

        prev_active = int(fist_stats.get("active_idx", 0))
        best_idx = prev_active if prev_active < len(ratios) else 0
        best_range = _range(best_idx)
        for i in range(len(ratios)):
            r = _range(i)
            if r > best_range + 0.08:
                best_idx = i
                best_range = r

        fist_stats["active_idx"] = best_idx
        return float(ratios[best_idx])

    def _update_rep_count(self, joint_angles: Dict, hand_landmarks: Any, ctx: Dict) -> None:
        """Update repetition counter using a robust hysteresis state machine."""
        tracker = ctx.setdefault(
            "rep_tracker",
            {
                "phase": "down",
                "hit_top": False,
                "last_angle": None,
                "filtered_angle": None,
                "observed_min": None,
                "observed_max": None,
                "peak_angle": None,
                "valley_angle": None,
                "last_rep_frame": -9999,
                "last_state_change_frame": 0,
                "side_stats": None,
                "wrist_hand_stats": None,
                "fist_hand_stats": None,
                "last_session_id": ctx.get("session_id", "temp_uid"),
                "last_exercise_name": ctx.get("exercise_name", ""),
            },
        )

        current_session_id = ctx.get("session_id", "temp_uid")
        current_exercise_name = ctx.get("exercise_name", "")

        if (
            current_session_id != tracker.get("last_session_id")
            or current_exercise_name != tracker.get("last_exercise_name")
        ):
            ctx["rep_count"] = 0
            tracker["phase"] = "down"
            tracker["hit_top"] = False
            tracker["last_angle"] = None
            tracker["filtered_angle"] = None
            tracker["observed_min"] = None
            tracker["observed_max"] = None
            tracker["peak_angle"] = None
            tracker["valley_angle"] = None
            tracker["last_rep_frame"] = -9999
            tracker["last_state_change_frame"] = 0
            tracker["side_stats"] = None
            tracker["wrist_hand_stats"] = None
            tracker["fist_hand_stats"] = None
            tracker["last_session_id"] = current_session_id
            tracker["last_exercise_name"] = current_exercise_name

        exercise_name = str(ctx.get("exercise_name", "")).lower()
        primary_joint = str(ctx.get("primary_joint", "")).lower()

        # Fist stretch mode: count each open->closed hand cycle.
        if "fist stretch" in exercise_name:
            open_ratio = self._extract_fist_open_ratio(hand_landmarks, tracker)
            if open_ratio is None:
                return

            frame_num = int(ctx.get("frame_count", 0))
            min_rep_gap_frames = 5

            obs_min = tracker.get("observed_min")
            obs_max = tracker.get("observed_max")
            if obs_min is None:
                obs_min = open_ratio
            if obs_max is None:
                obs_max = open_ratio
            obs_min = float(min(float(obs_min), open_ratio))
            obs_max = float(max(float(obs_max), open_ratio))
            tracker["observed_min"] = obs_min
            tracker["observed_max"] = obs_max

            observed_range = obs_max - obs_min
            close_threshold = 1.85
            open_threshold = 2.35
            if observed_range >= 0.28:
                close_threshold = obs_min + observed_range * 0.32
                open_threshold = obs_min + observed_range * 0.72
                if open_threshold - close_threshold < 0.18:
                    midpoint = (open_threshold + close_threshold) / 2.0
                    close_threshold = midpoint - 0.09
                    open_threshold = midpoint + 0.09

            if tracker.get("phase") not in ["open", "closed"]:
                tracker["phase"] = "open"

            if (
                tracker.get("phase") == "open"
                and open_ratio <= close_threshold
                and frame_num - int(tracker.get("last_rep_frame", -9999)) >= min_rep_gap_frames
            ):
                ctx["rep_count"] = int(ctx.get("rep_count", 0)) + 1
                tracker["phase"] = "closed"
                tracker["last_rep_frame"] = frame_num
                return

            if tracker.get("phase") == "closed" and open_ratio >= open_threshold:
                tracker["phase"] = "open"
            return

        # Finger tapping mode: count each open->closed pinch cycle (thumb tip to index tip).
        if "finger" in exercise_name or "finger" in primary_joint:
            tap_distance = self._extract_finger_tap_distance(hand_landmarks)
            close_threshold_px = 28.0
            open_threshold_px = 45.0
            frame_num = int(ctx.get("frame_count", 0))
            min_tap_gap_frames = 4

            if tracker.get("phase") not in ["open", "closed"]:
                tracker["phase"] = "open"

            if (
                tap_distance <= close_threshold_px
                and tracker.get("phase") == "open"
                and frame_num - int(tracker.get("last_rep_frame", -9999)) >= min_tap_gap_frames
            ):
                ctx["rep_count"] = int(ctx.get("rep_count", 0)) + 1
                tracker["phase"] = "closed"
                tracker["last_rep_frame"] = frame_num
                return

            if tap_distance >= open_threshold_px and tracker.get("phase") == "closed":
                tracker["phase"] = "open"
            return

        is_wrist = "wrist" in primary_joint or "wrist" in exercise_name

        raw_angle = None
        if is_wrist:
            wrist_angles = self._extract_wrist_motion_angles(hand_landmarks)
            if wrist_angles:
                wrist_stats = tracker.get("wrist_hand_stats")
                if not isinstance(wrist_stats, dict):
                    wrist_stats = {
                        "hands": {},
                        "active_idx": 0,
                    }
                    tracker["wrist_hand_stats"] = wrist_stats

                hands_stats = wrist_stats.setdefault("hands", {})

                for idx, val in enumerate(wrist_angles):
                    h = hands_stats.get(idx)
                    if not isinstance(h, dict):
                        h = {"min": float(val), "max": float(val)}
                        hands_stats[idx] = h
                    h["min"] = min(float(h["min"]), float(val))
                    h["max"] = max(float(h["max"]), float(val))

                def _range(i: int) -> float:
                    h = hands_stats.get(i)
                    if not isinstance(h, dict):
                        return 0.0
                    return float(h["max"]) - float(h["min"])

                prev_active = int(wrist_stats.get("active_idx", 0))
                best_idx = prev_active if prev_active < len(wrist_angles) else 0
                best_range = _range(best_idx)
                for i in range(len(wrist_angles)):
                    r = _range(i)
                    if r > best_range + 3.0:
                        best_idx = i
                        best_range = r

                wrist_stats["active_idx"] = best_idx
                raw_angle = float(wrist_angles[best_idx])

        if raw_angle is None:
            raw_angle = self._resolve_primary_angle(joint_angles, ctx, tracker)
        prev_filtered = tracker.get("filtered_angle")
        if prev_filtered is None:
            filtered_angle = float(raw_angle)
        else:
            # EMA smoothing to reduce jitter-induced false reps.
            filtered_angle = float(0.35 * raw_angle + 0.65 * float(prev_filtered))

        angle = filtered_angle
        tracker["last_angle"] = raw_angle
        tracker["filtered_angle"] = filtered_angle

        if tracker.get("observed_min") is None:
            tracker["observed_min"] = angle
        if tracker.get("observed_max") is None:
            tracker["observed_max"] = angle

        tracker["observed_min"] = float(min(float(tracker["observed_min"]), angle))
        tracker["observed_max"] = float(max(float(tracker["observed_max"]), angle))

        target_rom_min = float(ctx.get("target_rom_min", 30.0))
        target_rom_max = float(ctx.get("target_rom_max", 140.0))

        primary_joint = str(ctx.get("primary_joint", "")).lower()
        exercise_name = str(ctx.get("exercise_name", "")).lower()

        required_movement = 8.0 if is_wrist else 20.0

        configured_range = max(target_rom_max - target_rom_min, 1.0)
        min_thresh = target_rom_min + configured_range * 0.25
        max_thresh = target_rom_min + configured_range * 0.70

        if max_thresh <= min_thresh:
            mid = (target_rom_min + target_rom_max) / 2.0
            min_thresh = mid - 10.0
            max_thresh = mid + 10.0

        observed_min = float(tracker["observed_min"])
        observed_max = float(tracker["observed_max"])
        observed_range = observed_max - observed_min

        if observed_range >= required_movement:
            min_thresh = observed_min + observed_range * 0.30
            max_thresh = observed_min + observed_range * 0.72

        frame_num = int(ctx.get("frame_count", 0))
        min_rep_gap_frames = 8
        min_state_gap_frames = 3

        if angle >= max_thresh:
            if frame_num - int(tracker.get("last_state_change_frame", 0)) >= min_state_gap_frames:
                tracker["phase"] = "up"
                tracker["hit_top"] = True
                tracker["last_state_change_frame"] = frame_num
            tracker["peak_angle"] = angle if tracker.get("peak_angle") is None else max(float(tracker["peak_angle"]), angle)
            return

        # Count a rep once we have a meaningful drop from the recorded top position.
        peak_raw = tracker.get("peak_angle")
        peak = float(peak_raw if isinstance(peak_raw, (int, float)) else angle)
        drop_needed = max(required_movement * 0.55, observed_range * 0.22)
        if (
            tracker.get("phase") == "up"
            and tracker.get("hit_top")
            and angle <= peak - drop_needed
            and frame_num - int(tracker.get("last_rep_frame", -9999)) >= min_rep_gap_frames
        ):
            ctx["rep_count"] = int(ctx.get("rep_count", 0)) + 1
            tracker["hit_top"] = False
            tracker["phase"] = "down"
            tracker["last_rep_frame"] = frame_num
            tracker["last_state_change_frame"] = frame_num
            tracker["peak_angle"] = angle
            tracker["valley_angle"] = angle
            return

        if angle <= min_thresh:
            if tracker.get("valley_angle") is None:
                tracker["valley_angle"] = angle
            else:
                tracker["valley_angle"] = min(float(tracker["valley_angle"]), angle)

            peak = float(tracker.get("peak_angle", angle))
            valley = float(tracker.get("valley_angle", angle))
            excursion = peak - valley

            if (
                tracker.get("phase") == "up"
                and tracker.get("hit_top")
                and excursion >= required_movement
                and frame_num - int(tracker.get("last_rep_frame", -9999)) >= min_rep_gap_frames
            ):
                ctx["rep_count"] = int(ctx.get("rep_count", 0)) + 1
                tracker["hit_top"] = False
                tracker["last_rep_frame"] = frame_num
                tracker["peak_angle"] = angle
                tracker["valley_angle"] = angle
            tracker["phase"] = "down"
            tracker["last_state_change_frame"] = frame_num

    def _decode_base64_frame(self, b64_str: str) -> Any:
        """Safely decode base64 frame to OpenCV image."""
        try:
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            
            img_data = base64.b64decode(b64_str)
            img_array = np.frombuffer(img_data, dtype=np.uint8)
            frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            
            if frame is None:
                logger.warning("Frame decode returned None")
                return None
            
            return frame
        except Exception as e:
            logger.error(f"Frame decode error: {e}")
            return None

    def _generate_feedback(
        self,
        is_correct: bool,
        anomaly_score: float,
        deviation: float,
        fatigue: float,
        facial_data: Dict,
        ctx: Dict,
        lang_code: str
    ) -> Tuple[Dict, Dict]:
        """Generate real-time feedback and audio triggers."""
        try:
            current_time = time.time()
            can_speak = (current_time - ctx.get("last_audio_time", 0)) > 5.0
            audio_trigger = None
            
            status = "correct"
            color = "#00E5A0"
            msg = "Excellent form! Keep going."
            phrase_key = "good_form"
            
            # Safety first
            if facial_data.get("pain", 0.0) > 0.5:
                status = "warning"
                color = "#FF4444"
                msg = "You appear to be in pain. Stop immediately and rest."
                phrase_key = "take_rest"
            elif fatigue > 80.0:
                status = "warning"
                color = "#FFD600"
                msg = "High fatigue detected. Take a rest break."
                phrase_key = "take_rest"
            elif not is_correct or anomaly_score > 0.7:
                status = "incorrect"
                color = "#FF4444"
                msg = "Adjust your posture to match the target form."
                phrase_key = "bad_form"
            elif deviation > 20.0:
                status = "warning"
                color = "#FFD600"
                msg = f"Move closer to target angle ({deviation:.1f}° off)."
                phrase_key = "bend_joint"
            
            if can_speak and status != "correct":
                audio_trigger = {"phrase_key": phrase_key, "lang": lang_code}
                ctx["last_audio_time"] = current_time
            
            return {
                "status": status,
                "color": color,
                "message": msg
            }, audio_trigger
        
        except Exception as e:
            logger.error(f"Feedback generation error: {e}")
            return {"status": "correct", "color": "green", "message": "Processing..."}, None

    def _safe_default_response(self, session_context: Dict) -> Dict:
        """Return safe defaults when processing fails."""
        return {
            "landmarks_px": [],
            "exercise": "Initializing...",
            "confidence": 0.0,
            "rep_count": session_context.get("rep_count", 0),
            "feedback": {
                "status": "correct",
                "color": "#00E5A0",
                "message": "Initializing AI pipeline..."
            },
            "digital_twin": {
                "predicted_rom": 85.0,
                "fatigue_score": 10.0,
                "target_angle": 90.0,
                "deviation_score": 0.0
            },
            "cognitive_engagement": {
                "cognitive_lstm": {"score": 85.0, "trend": "Baseline"},
                "face_m12": session_context.get("facial_data", {})
            },
            "form": {
                "is_correct": True,
                "anomaly_score": None
            },
            "metrics": {
                "latency_ms": 0,
                "frame_num": session_context.get("frame_count", 0)
            }
        }


# Create global pipeline instance
try:
    pipeline_instance = RealtimePipeline()
    logger.info("✅ GLOBAL PIPELINE INSTANCE CREATED AND READY")
except Exception as e:
    logger.critical(f"❌ FATAL: Pipeline initialization failed: {e}")
    raise
