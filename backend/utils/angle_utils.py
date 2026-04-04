"""
Utility functions for computing joint angles from pose landmarks.
Supports: shoulder flexion/abduction, elbow, knee, hip, ankle angles.
"""

import numpy as np
import logging
from typing import Dict, Tuple, List

logger = logging.getLogger(__name__)

def distance(p1: Dict, p2: Dict) -> float:
    """Calculate Euclidean distance between two landmarks."""
    try:
        x1, y1, z1 = p1.get("x", 0), p1.get("y", 0), p1.get("z", 0)
        x2, y2, z2 = p2.get("x", 0), p2.get("y", 0), p2.get("z", 0)
        return np.sqrt((x2 - x1)**2 + (y2 - y1)**2 + (z2 - z1)**2)
    except Exception as e:
        logger.warning(f"Error computing distance: {e}")
        return 0.0

def unit_vector(vector: np.ndarray) -> np.ndarray:
    """Return unit vector for a given 3D vector."""
    try:
        norm = np.linalg.norm(vector)
        if norm > 1e-6:
            return vector / norm
        return vector
    except Exception:
        return np.array([0, 0, 0])

def angle_between_vectors(v1: np.ndarray, v2: np.ndarray) -> float:
    """
    Calculate angle (in degrees) between two vectors.
    Safe clipping to avoid numerical errors in acos.
    """
    try:
        u1 = unit_vector(v1)
        u2 = unit_vector(v2)
        dot_product = np.clip(np.dot(u1, u2), -1, 1)
        rad = np.arccos(dot_product)
        return np.degrees(rad)
    except Exception as e:
        logger.warning(f"Error computing angle: {e}")
        return 0.0

def three_point_angle(p1: Dict, p2: Dict, p3: Dict) -> float:
    """
    Compute angle at vertex p2 formed by points p1-p2-p3.
    Returns angle in degrees (0-180).
    """
    try:
        v1 = np.array([p1.get("x", 0) - p2.get("x", 0),
                       p1.get("y", 0) - p2.get("y", 0),
                       p1.get("z", 0) - p2.get("z", 0)])
        v2 = np.array([p3.get("x", 0) - p2.get("x", 0),
                       p3.get("y", 0) - p2.get("y", 0),
                       p3.get("z", 0) - p2.get("z", 0)])
        return angle_between_vectors(v1, v2)
    except Exception as e:
        logger.warning(f"Error computing three-point angle: {e}")
        return 0.0

def compute_joint_angles(landmarks: List[Dict]) -> Dict[str, float]:
    """
    Compute key joint angles from 33 MediaPipe pose landmarks.
    
    Landmarks:
    - 0: nose, 11: left_shoulder, 12: right_shoulder
    - 13: left_elbow, 14: right_elbow
    - 15: left_wrist, 16: right_wrist
    - 23: left_hip, 24: right_hip
    - 25: left_knee, 26: right_knee
    - 27: left_ankle, 28: right_ankle
    """
    angles = {}
    
    try:
        if len(landmarks) < 29:
            logger.warning(f"Insufficient landmarks: {len(landmarks)} < 29")
            return get_default_angles()
        
        # Left arm angles
        if landmarks[11] and landmarks[13] and landmarks[15]:
            angles["left_elbow"] = three_point_angle(
                landmarks[11], landmarks[13], landmarks[15]
            )
        if landmarks[13] and landmarks[11] and landmarks[23]:
            angles["left_shoulder"] = three_point_angle(
                landmarks[13], landmarks[11], landmarks[23]
            )
        
        # Right arm angles
        if landmarks[12] and landmarks[14] and landmarks[16]:
            angles["right_elbow"] = three_point_angle(
                landmarks[12], landmarks[14], landmarks[16]
            )
        if landmarks[14] and landmarks[12] and landmarks[24]:
            angles["right_shoulder"] = three_point_angle(
                landmarks[14], landmarks[12], landmarks[24]
            )

        # Wrist flexion/extension approximated using elbow-wrist-index-finger landmarks
        if len(landmarks) > 20 and landmarks[13] and landmarks[15] and landmarks[19]:
            angles["left_wrist"] = three_point_angle(
                landmarks[13], landmarks[15], landmarks[19]
            )
        if len(landmarks) > 20 and landmarks[14] and landmarks[16] and landmarks[20]:
            angles["right_wrist"] = three_point_angle(
                landmarks[14], landmarks[16], landmarks[20]
            )
        
        # Left leg angles
        if landmarks[23] and landmarks[25] and landmarks[27]:
            angles["left_knee"] = three_point_angle(
                landmarks[23], landmarks[25], landmarks[27]
            )
        if landmarks[11] and landmarks[23] and landmarks[25]:
            angles["left_hip"] = three_point_angle(
                landmarks[11], landmarks[23], landmarks[25]
            )
        if landmarks[25] and landmarks[27] and landmarks[31]:
            angles["left_ankle"] = three_point_angle(
                landmarks[25], landmarks[27], landmarks[31]
            )
        
        # Right leg angles
        if landmarks[24] and landmarks[26] and landmarks[28]:
            angles["right_knee"] = three_point_angle(
                landmarks[24], landmarks[26], landmarks[28]
            )
        if landmarks[12] and landmarks[24] and landmarks[26]:
            angles["right_hip"] = three_point_angle(
                landmarks[12], landmarks[24], landmarks[26]
            )
        if landmarks[26] and landmarks[28] and landmarks[32]:
            angles["right_ankle"] = three_point_angle(
                landmarks[26], landmarks[28], landmarks[32]
            )
        
        return angles if angles else get_default_angles()
    except Exception as e:
        logger.error(f"Error computing joint angles: {e}")
        return get_default_angles()

def get_default_angles() -> Dict[str, float]:
    """Return default angles when computation fails."""
    return {
        "left_shoulder": 90.0,
        "right_shoulder": 90.0,
        "left_elbow": 90.0,
        "right_elbow": 90.0,
        "left_hip": 90.0,
        "right_hip": 90.0,
        "left_knee": 90.0,
        "right_knee": 90.0,
        "left_ankle": 90.0,
        "right_ankle": 90.0,
        "left_wrist": 90.0,
        "right_wrist": 90.0,
    }

def normalize_angle(angle: float, min_val: float = 0.0, max_val: float = 180.0) -> float:
    """Normalize angle to [0, 1] range."""
    clipped = np.clip(angle, min_val, max_val)
    return (clipped - min_val) / (max_val - min_val)

def angle_deviation(actual: float, target: float) -> float:
    """Calculate absolute deviation from target angle."""
    return abs(actual - target)
