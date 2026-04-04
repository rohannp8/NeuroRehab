"""
M01 — MediaPipe BlazePose
Detects 33 body keypoints from a webcam frame in real time and returns
8 joint angles (degrees) plus raw/pixel landmarks.

Install:
    pip install mediapipe opencv-python numpy
"""

import math
from pathlib import Path
import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import vision as mp_vision
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision.core.vision_task_running_mode import (
    VisionTaskRunningMode,
)

# ---------------------------------------------------------------------------
# MediaPipe setup
# ---------------------------------------------------------------------------
_mp_pose = mp_vision

_MODEL_PATH = Path(__file__).with_name("pose_landmarker_lite.task")
if not _MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Missing model file: {_MODEL_PATH}. Please download pose_landmarker_lite.task"
    )

_HAND_MODEL_PATH = Path(__file__).with_name("hand_landmarker.task")
if not _HAND_MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Missing model file: {_HAND_MODEL_PATH}. Please download hand_landmarker.task"
    )

_pose = _mp_pose.PoseLandmarker.create_from_options(
    _mp_pose.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(_MODEL_PATH)),
        running_mode=VisionTaskRunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.1,
        min_pose_presence_confidence=0.1,
        min_tracking_confidence=0.1,
        output_segmentation_masks=False,
    )
)

_hands = _mp_pose.HandLandmarker.create_from_options(
    _mp_pose.HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(_HAND_MODEL_PATH)),
        running_mode=VisionTaskRunningMode.VIDEO,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
)

# ---------------------------------------------------------------------------
# Landmark index aliases (MediaPipe numbering)
# ---------------------------------------------------------------------------
LM = _mp_pose.PoseLandmark
_POSE_CONNECTIONS = [
    (conn.start, conn.end)
    for conn in _mp_pose.PoseLandmarksConnections.POSE_LANDMARKS
]
_HAND_CONNECTIONS = [
    (conn.start, conn.end)
    for conn in _mp_pose.HandLandmarksConnections.HAND_CONNECTIONS
]

# Joint triplets: (A, vertex, B) — angle is calculated AT vertex
_JOINT_TRIPLETS = {
    "left_elbow":    (LM.LEFT_SHOULDER,  LM.LEFT_ELBOW,   LM.LEFT_WRIST),
    "right_elbow":   (LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW,  LM.RIGHT_WRIST),
    "left_shoulder": (LM.LEFT_ELBOW,     LM.LEFT_SHOULDER, LM.LEFT_HIP),
    "right_shoulder":(LM.RIGHT_ELBOW,    LM.RIGHT_SHOULDER,LM.RIGHT_HIP),
    "left_hip":      (LM.LEFT_SHOULDER,  LM.LEFT_HIP,     LM.LEFT_KNEE),
    "right_hip":     (LM.RIGHT_SHOULDER, LM.RIGHT_HIP,    LM.RIGHT_KNEE),
    "left_knee":     (LM.LEFT_HIP,       LM.LEFT_KNEE,    LM.LEFT_ANKLE),
    "right_knee":    (LM.RIGHT_HIP,      LM.RIGHT_KNEE,   LM.RIGHT_ANKLE),
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _angle(a, vertex, b) -> float:
    """Return the angle in degrees at *vertex* formed by points a–vertex–b."""
    ax, ay = a[0] - vertex[0], a[1] - vertex[1]
    bx, by = b[0] - vertex[0], b[1] - vertex[1]
    dot = ax * bx + ay * by
    mag_a = math.hypot(ax, ay)
    mag_b = math.hypot(bx, by)
    if mag_a < 1e-6 or mag_b < 1e-6:
        return 0.0
    cos_val = max(-1.0, min(1.0, dot / (mag_a * mag_b)))
    return math.degrees(math.acos(cos_val))


def _lm_xyz(landmark):
    """Return (x, y, z) from a MediaPipe NormalizedLandmark."""
    return landmark.x, landmark.y, landmark.z


def _lm_visible(landmark, threshold: float = 0.5) -> bool:
    return landmark.visibility >= threshold


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def get_landmarks(frame: np.ndarray, timestamp_ms: int) -> dict:
    """
    Process a single BGR frame and return pose data.

    Parameters
    ----------
    frame : np.ndarray
        BGR image array (H, W, 3) as returned by cv2.VideoCapture.read().

    Returns
    -------
    dict with keys:
        detected      : bool   — True if a pose was found
        landmarks_raw : list[dict]  — 33 entries, each with x,y,z,visibility
                                      (normalised 0-1 coords)
        landmarks_px  : list[tuple] — 33 (px, py) pixel coords, or None if not detected
        joint_angles  : dict[str, float|None]  — 8 named angles in degrees;
                                                  None when a joint is occluded
    """
    h, w = frame.shape[:2]

    # MediaPipe requires RGB
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = _pose.detect_for_video(mp_image, timestamp_ms)
    hand_result = _hands.detect_for_video(mp_image, timestamp_ms)

    hand_landmarks_px = []
    for hand_lms in hand_result.hand_landmarks:
        hand_landmarks_px.append(
            [
                (
                    int(min(max(lm.x * w, 0), w - 1)),
                    int(min(max(lm.y * h, 0), h - 1)),
                )
                for lm in hand_lms
            ]
        )

    if not result.pose_landmarks:
        return {
            "detected": False,
            "landmarks_raw": [],
            "landmarks_px": None,
            "joint_angles": {k: None for k in _JOINT_TRIPLETS},
            "hand_landmarks_px": hand_landmarks_px,
        }

    lms = result.pose_landmarks[0]

    # Build landmarks_raw
    landmarks_raw = [
        {
            "x": lm.x,
            "y": lm.y,
            "z": lm.z,
            "visibility": lm.visibility,
        }
        for lm in lms
    ]

    # Build landmarks_px  (pixel coords, clamped to frame size)
    landmarks_px = [
        (
            int(min(max(lm.x * w, 0), w - 1)),
            int(min(max(lm.y * h, 0), h - 1)),
        )
        for lm in lms
    ]

    # Calculate 8 joint angles
    joint_angles = {}
    for joint_name, (idx_a, idx_v, idx_b) in _JOINT_TRIPLETS.items():
        lm_a, lm_v, lm_b = lms[idx_a], lms[idx_v], lms[idx_b]
        # Skip if any landmark is occluded
        if not (_lm_visible(lm_a) and _lm_visible(lm_v) and _lm_visible(lm_b)):
            joint_angles[joint_name] = None
        else:
            joint_angles[joint_name] = round(
                _angle(_lm_xyz(lm_a), _lm_xyz(lm_v), _lm_xyz(lm_b)), 2
            )

    return {
        "detected": True,
        "landmarks_raw": landmarks_raw,
        "landmarks_px": landmarks_px,
        "joint_angles": joint_angles,
        "hand_landmarks_px": hand_landmarks_px,
    }


def draw_skeleton(frame: np.ndarray, pose_data: dict) -> np.ndarray:
    """
    Draw the BlazePose skeleton and joint-angle labels onto *frame*.

    Parameters
    ----------
    frame     : BGR numpy array (modified in-place and returned)
    pose_data : dict returned by get_landmarks()

    Returns
    -------
    Annotated BGR frame.
    """
    if pose_data["detected"]:
        # Draw skeleton lines and keypoints from pixel landmarks.
        pts = pose_data["landmarks_px"]
        for i, j in _POSE_CONNECTIONS:
            cv2.line(frame, pts[i], pts[j], (80, 220, 80), 2, cv2.LINE_AA)
        for px, py in pts:
            cv2.circle(frame, (px, py), 3, (20, 160, 255), -1, cv2.LINE_AA)

    # Draw all detected hand skeletons (21 landmarks each), including fingers.
    for hand_pts in pose_data.get("hand_landmarks_px", []):
        for i, j in _HAND_CONNECTIONS:
            cv2.line(frame, hand_pts[i], hand_pts[j], (255, 120, 20), 2, cv2.LINE_AA)
        for k, (px, py) in enumerate(hand_pts):
            radius = 4 if k in {4, 8, 12, 16, 20} else 3
            color = (0, 255, 255) if k in {4, 8, 12, 16, 20} else (255, 255, 255)
            cv2.circle(frame, (px, py), radius, color, -1, cv2.LINE_AA)

    # Overlay joint angles as text near each vertex landmark
    if pose_data["detected"]:
        for joint_name, (idx_a, idx_v, idx_b) in _JOINT_TRIPLETS.items():
            angle = pose_data["joint_angles"].get(joint_name)
            if angle is None:
                continue
            px, py = pose_data["landmarks_px"][idx_v]
            cv2.putText(
                frame,
                f"{int(angle)}°",
                (px + 5, py - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 255, 255),
                1,
                cv2.LINE_AA,
            )

    return frame


# ---------------------------------------------------------------------------
# Standalone webcam demo  (python 01_blazepose.py)
# ---------------------------------------------------------------------------
def _run_webcam_demo():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Cannot open webcam.")
        return

    print("BlazePose live demo — press Q to quit.")
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        timestamp_ms = int(cv2.getTickCount() / cv2.getTickFrequency() * 1000)
        data = get_landmarks(frame, timestamp_ms)
        frame = draw_skeleton(frame, data)

        status = "DETECTED" if data["detected"] else "NO POSE"
        cv2.putText(frame, status, (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                    (0, 255, 0) if data["detected"] else (0, 0, 255),
                    2, cv2.LINE_AA)

        cv2.putText(
            frame,
            f"hands: {len(data.get('hand_landmarks_px', []))}",
            (10, 52),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 200, 0),
            2,
            cv2.LINE_AA,
        )

        if data["detected"]:
            y0 = 78
            for name, val in data["joint_angles"].items():
                label = f"{name}: {val}°" if val is not None else f"{name}: occluded"
                cv2.putText(frame, label, (10, y0),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                y0 += 18

        cv2.imshow("M01 — BlazePose", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    _run_webcam_demo()
