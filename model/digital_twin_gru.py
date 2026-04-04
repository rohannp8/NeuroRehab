import numpy as np

class DigitalTwinGRU:
    def __init__(self, model_instance=None):
        """
        Initializes the GRU model predicting ROM and Fatigue.
        """
        self.model = model_instance

    def predict(self, window_features: list) -> tuple:
        """
        Takes a sliding window (e.g. 30 frames) of joint_angles dicts.
        Returns:
            predicted_rom: float
            fatigue_score: float
            target_angle: float
        """
        if not window_features:
            return 0.0, 0.0, 90.0

        # MOCK IMPLEMENTATION for demo
        # In full prod, format history into (1, 30, num_features) tensor for Keras/PyTorch
        recent_knee_angles = [f.get("left_knee", 0.0) for f in window_features if f.get("left_knee") is not None]
        
        if len(recent_knee_angles) > 0:
            current_rom = max(recent_knee_angles) - min(recent_knee_angles)
            # Predict slightly further ROM based on history
            predicted_rom = float(current_rom) + 5.0
            # Fatigue increases with repetitive similar history (mock math)
            fatigue_score = min(100.0, float(len(recent_knee_angles)) * 0.8) 
            target_angle = 120.0
        else:
            predicted_rom = 85.0
            fatigue_score = 12.5
            target_angle = 90.0
            
        return predicted_rom, fatigue_score, target_angle
