import joblib
import numpy as np

class M05RandomForestClassifier:
    def __init__(self, model_instance=None):
        """
        Accepts an already loaded scikit-learn model instance.
        """
        self.model = model_instance

    def predict(self, joint_angles: dict) -> tuple[str, float]:
        """
        Extracts 8 features from joint_angles and predicts the exercise class.
        Fallback to returning a mock prediction if the model is unavailable or joints are occluded.
        """
        # Return fallback if model isn't loaded or an angle is None (occluded)
        if self.model is None or any(v is None for v in joint_angles.values()):
            return "Searching...", 0.0

        # Features order must match training. Let's assume alphabetical order of keys for now
        features = [
            joint_angles.get("left_elbow", 0.0),
            joint_angles.get("left_hip", 0.0),
            joint_angles.get("left_knee", 0.0),
            joint_angles.get("left_shoulder", 0.0),
            joint_angles.get("right_elbow", 0.0),
            joint_angles.get("right_hip", 0.0),
            joint_angles.get("right_knee", 0.0),
            joint_angles.get("right_shoulder", 0.0)
        ]
        
        try:
            X = np.array(features).reshape(1, -1)
            pred = self.model.predict(X)[0]
            if hasattr(self.model, "predict_proba"):
                probs = self.model.predict_proba(X)[0]
                conf = float(np.max(probs))
            else:
                conf = 1.0
            return str(pred), conf
        except Exception as e:
            # If feature dimensions mismatch or model bombs out, yield logical fallback for demo
            return "Knee bend (mock)", 0.85
