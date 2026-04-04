import numpy as np

try:
    from deepface import DeepFace
except ImportError:
    DeepFace = None

class M12FacialDetector:
    def __init__(self):
        # Graceful fallback if DeepFace library is not pip installed yet
        self.is_active = DeepFace is not None

    def analyze_face(self, frame_bgr: np.ndarray) -> dict:
        """
        Uses DeepFace to analyze raw webcam frames for emotional state mapping
        to 'pain' and 'diminished engagement'. 
        """
        default_eval = {"engagement": 0.85, "pain": 0.0, "emotion": "neutral"}
        
        if not self.is_active:
            return default_eval
            
        try:
            # We enforce FAST emotion-only analysis so we don't blow our <100ms budget limit
            result = DeepFace.analyze(
                frame_bgr, 
                actions=['emotion'], 
                enforce_detection=False,
                silent=True
            )
            # Result is a list if multiple faces are detected, grab the primary one
            res = result[0] if isinstance(result, list) else result
            
            emotions = res.get("emotion", {})
            sad_angry_fear = emotions.get("sad", 0.0) + emotions.get("angry", 0.0) + emotions.get("fear", 0.0)
            
            emotion_lbl = res.get("dominant_emotion", "neutral")
            
            # Mapping anger/fear/sad combinations as a proxy for physical "pain/discomfort"
            pain_prob = min(1.0, sad_angry_fear / 80.0) 
            
            engagement = 1.0 - (emotions.get("neutral", 0) * 0.002) - (pain_prob * 0.2)
            
            return {
                "engagement": round(float(np.clip(engagement, 0.0, 1.0)), 2),
                "pain": round(float(pain_prob), 2),
                "emotion": emotion_lbl
            }
        except Exception:
            return default_eval
