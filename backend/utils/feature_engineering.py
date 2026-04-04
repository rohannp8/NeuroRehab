"""
Feature Engineering Pipeline for real-time pose analysis.
Converts raw pose landmarks → ML-ready features for classification & anomaly detection.
"""

import numpy as np
import logging
from typing import Dict, List, Tuple
from collections import deque
from .angle_utils import compute_joint_angles, normalize_angle

logger = logging.getLogger(__name__)

class FeatureEngineer:
    """Transform pose data into features for ML models."""
    
    def __init__(self, window_size: int = 5):
        self.window_size = window_size
        self.angle_history = deque(maxlen=window_size)
    
    def extract_static_features(self, landmarks: List[Dict], joint_angles: Dict) -> Dict:
        """
        Extract static features from a single frame.
        - Joint angles
        - Distances between key points
        - Body proportions
        """
        try:
            features = {}
            
            # 1. Raw joint angles
            for joint, angle in joint_angles.items():
                features[f"angle_{joint}"] = float(angle)
            
            # 2. Normalized angles (0-1 range)
            for joint, angle in joint_angles.items():
                features[f"norm_{joint}"] = normalize_angle(angle, 0, 180)
            
            # 3. Distances between key points (body dimensions)
            if len(landmarks) >= 29:
                # Shoulder width
                features["shoulder_width"] = self._compute_distance(
                    landmarks[11], landmarks[12]
                )
                
                # Hip width
                features["hip_width"] = self._compute_distance(
                    landmarks[23], landmarks[24]
                )
                
                # Torso length
                features["torso_length"] = self._compute_distance(
                    landmarks[11], landmarks[23]
                )
                
                # Left arm length
                features["left_arm_length"] = self._compute_distance(
                    landmarks[11], landmarks[15]
                )
                
                # Right arm length
                features["right_arm_length"] = self._compute_distance(
                    landmarks[12], landmarks[16]
                )
                
                # Left leg length
                features["left_leg_length"] = self._compute_distance(
                    landmarks[23], landmarks[27]
                )
                
                # Right leg length
                features["right_leg_length"] = self._compute_distance(
                    landmarks[24], landmarks[28]
                )
            
            # 4. Symmetry features (left vs right)
            features["shoulder_symmetry"] = abs(
                joint_angles.get("left_shoulder", 90) - joint_angles.get("right_shoulder", 90)
            )
            features["elbow_symmetry"] = abs(
                joint_angles.get("left_elbow", 90) - joint_angles.get("right_elbow", 90)
            )
            features["hip_symmetry"] = abs(
                joint_angles.get("left_hip", 90) - joint_angles.get("right_hip", 90)
            )
            features["knee_symmetry"] = abs(
                joint_angles.get("left_knee", 90) - joint_angles.get("right_knee", 90)
            )
            
            return features
        except Exception as e:
            logger.error(f"Error extracting static features: {e}")
            return self._default_features()
    
    def extract_temporal_features(self, angle_window: List[Dict]) -> Dict:
        """
        Extract temporal features from a window of frames.
        - Velocity (rate of change)
        - Acceleration
        - Smoothness
        - Range of motion
        """
        features = {}
        try:
            if len(angle_window) < 2:
                return features
            
            joints = list(angle_window[0].keys())
            
            for joint in joints:
                values = [frame.get(joint, 90) for frame in angle_window]
                
                # Velocity (first derivative)
                velocity = np.diff(values)
                features[f"vel_{joint}_mean"] = float(np.mean(np.abs(velocity)))
                features[f"vel_{joint}_std"] = float(np.std(velocity))
                
                # Acceleration (second derivative)
                if len(velocity) > 1:
                    acceleration = np.diff(velocity)
                    features[f"acc_{joint}_mean"] = float(np.mean(np.abs(acceleration)))
                
                # Range of motion
                features[f"rom_{joint}"] = float(np.ptp(values))  # peak-to-peak
                
                # Smoothness (inverse of jerkiness)
                if len(values) > 2:
                    jerk = np.diff(acceleration) if len(velocity) > 1 else np.array([0])
                    features[f"smooth_{joint}"] = 1.0 / (1.0 + np.mean(np.abs(jerk)))
            
            return features
        except Exception as e:
            logger.error(f"Error extracting temporal features: {e}")
            return features
    
    def _compute_distance(self, p1: Dict, p2: Dict) -> float:
        """Euclidean distance between two landmarks."""
        try:
            x1, y1, z1 = p1.get("x", 0), p1.get("y", 0), p1.get("z", 0)
            x2, y2, z2 = p2.get("x", 0), p2.get("y", 0), p2.get("z", 0)
            return float(np.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2))
        except Exception:
            return 0.0
    
    def _default_features(self) -> Dict:
        """Return a set of default features when extraction fails."""
        return {key: 0.0 for key in [
            "angle_left_shoulder", "angle_right_shoulder",
            "angle_left_elbow", "angle_right_elbow",
            "angle_left_knee", "angle_right_knee",
            "shoulder_width", "hip_width", "torso_length",
            "shoulder_symmetry", "elbow_symmetry", "hip_symmetry"
        ]}
    
    def combine_features(self, static_features: Dict, temporal_features: Dict) -> np.ndarray:
        """
        Combine static and temporal features into a single feature vector.
        Returns a 1D numpy array suitable for ML models.
        """
        try:
            all_features = {**static_features, **temporal_features}
            # Sort by key to ensure consistent ordering
            sorted_keys = sorted(all_features.keys())
            feature_vector = np.array([all_features[key] for key in sorted_keys], dtype=np.float32)
            return feature_vector
        except Exception as e:
            logger.error(f"Error combining features: {e}")
            return np.zeros(20, dtype=np.float32)


def validate_pose_data(landmarks: List[Dict], min_confidence: float = 0.5) -> bool:
    """
    Validate pose data before processing.
    Check for sufficient landmarks and minimum visibility.
    """
    try:
        if not landmarks or len(landmarks) < 15:
            return False
        
        visible_count = sum(1 for lm in landmarks if lm.get("visibility", 0) > min_confidence)
        return visible_count > len(landmarks) * 0.7  # At least 70% of landmarks visible
    except Exception as e:
        logger.warning(f"Error validating pose data: {e}")
        return False

def smooth_feature_vector(feature_vector: np.ndarray, alpha: float = 0.6) -> np.ndarray:
    """
    Exponential smoothing to reduce noise.
    alpha: smoothing factor (0-1). Higher = more smoothing.
    """
    try:
        if not hasattr(smooth_feature_vector, "last_vector"):
            smooth_feature_vector.last_vector = np.zeros_like(feature_vector)
        
        smoothed = alpha * smooth_feature_vector.last_vector + (1 - alpha) * feature_vector
        smooth_feature_vector.last_vector = smoothed
        return smoothed
    except Exception:
        return feature_vector
