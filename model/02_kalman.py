"""
M02 — Kalman Filter landmark smoother
Removes jitter from BlazePose landmark coordinates.

Plug & Play — pure NumPy/SciPy math, no ML model needed.

Usage:
    from kalman import LandmarkSmoother
    smoother = LandmarkSmoother()          # one instance per video session

    # inside your frame loop:
    pose_data   = get_landmarks(frame)     # M01
    smooth_data = smoother.smooth(pose_data)

Install:
    pip install numpy scipy
"""

import numpy as np
import time


# ---------------------------------------------------------------------------
# Single-axis 1-D Kalman filter
# ---------------------------------------------------------------------------
class _KalmanFilter1D:
    """
    Constant-position 1-D Kalman filter.

    State model:   x_k  = x_{k-1}  + process_noise
    Measurement:   z_k  = x_k      + measurement_noise

    Parameters
    ----------
    Q : float  — process noise variance  (how much we expect the value to drift)
    R : float  — measurement noise variance (how noisy the sensor reading is)
    """

    def __init__(self, Q: float = 0.01, R: float = 0.1):
        self.Q = Q
        self.R = R
        self._x = None   # state estimate
        self._P = 1.0    # estimate error covariance

    def update(self, z: float) -> float:
        """Feed one measurement; return the smoothed estimate."""
        # First observation — initialise state to the measurement directly
        if self._x is None:
            self._x = z
            return z

        # Predict
        x_pred = self._x
        P_pred = self._P + self.Q

        # Update (Kalman gain)
        K      = P_pred / (P_pred + self.R)
        self._x = x_pred + K * (z - x_pred)
        self._P = (1.0 - K) * P_pred

        return self._x

    def reset(self):
        self._x = None
        self._P = 1.0


# ---------------------------------------------------------------------------
# Per-landmark smoother  (33 landmarks × 2 axes = 66 filters)
# ---------------------------------------------------------------------------
class LandmarkSmoother:
    """
    Smooths the raw landmark list produced by M01 get_landmarks().

    One _KalmanFilter1D is created for every (landmark_index, axis) pair.
    Only x and y are filtered — z (depth from single RGB) is left unchanged.
    visibility is passed through unchanged.

    Parameters
    ----------
    Q : float  — process noise   (default 0.01)
    R : float  — measurement noise (default 0.1)
    n_landmarks : int — expected number of landmarks (BlazePose = 33)
    """

    def __init__(self, Q: float = 0.01, R: float = 0.1, n_landmarks: int = 33):
        self.Q = Q
        self.R = R
        self.n = n_landmarks
        # filters[i][0] → x-axis filter for landmark i
        # filters[i][1] → y-axis filter for landmark i
        self._filters = [
            [_KalmanFilter1D(Q, R), _KalmanFilter1D(Q, R)]
            for _ in range(n_landmarks)
        ]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def smooth(self, pose_data: dict) -> dict:
        """
        Smooth the landmark coordinates inside a pose_data dict.

        Parameters
        ----------
        pose_data : dict
            Returned by M01 get_landmarks().  If detected=False the dict is
            returned unchanged (filters are NOT reset — they keep their state
            so the next detected frame continues smoothly).

        Returns
        -------
        New dict with the same structure as pose_data but with
        landmarks_raw x/y smoothed and landmarks_px recomputed.
        """
        if not pose_data.get("detected", False):
            return pose_data   # nothing to smooth

        raw = pose_data["landmarks_raw"]
        if len(raw) != self.n:
            # Unexpected landmark count — pass through unchanged
            return pose_data

        smoothed_raw = []
        for i, lm in enumerate(raw):
            sx = self._filters[i][0].update(lm["x"])
            sy = self._filters[i][1].update(lm["y"])
            smoothed_raw.append({
                "x":          sx,
                "y":          sy,
                "z":          lm["z"],          # depth kept as-is
                "visibility": lm["visibility"],
            })

        # Recompute pixel coords from smoothed normalised coords.
        # We need the frame dimensions; fall back to the original px list
        # shape if pose_data doesn't carry them explicitly.
        orig_px = pose_data.get("landmarks_px") or []
        smoothed_px = self._recompute_px(smoothed_raw, orig_px)

        out = {
            "detected":      True,
            "landmarks_raw": smoothed_raw,
            "landmarks_px":  smoothed_px,
            "joint_angles":  pose_data["joint_angles"],  # reuse M01 angles
        }
        # Preserve optional fields added by upstream modules (e.g. hands).
        for key in ("hand_landmarks_px",):
            if key in pose_data:
                out[key] = pose_data[key]
        return out

    def reset(self):
        """Reset all filters (call when switching subjects / sessions)."""
        for pair in self._filters:
            pair[0].reset()
            pair[1].reset()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _recompute_px(smoothed_raw: list, orig_px: list) -> list:
        """
        Convert smoothed normalised (x, y) back to pixel coords.

        Strategy: infer frame size from the original pixel list if available,
        otherwise fall back to a default 640×480 assumption.
        """
        if orig_px:
            # Estimate frame dimensions from the original px coordinates
            # by finding the max values (they should be close to w-1, h-1)
            xs = [p[0] for p in orig_px]
            ys = [p[1] for p in orig_px]
            # Use a safe upper bound: largest raw landmark normalised coord
            # that produced the farthest pixel gives us approx frame size.
            # Simpler: just use the known 640×480 default unless we stored dims.
            # We use the original pixel's scale: px = x_norm * w → w ≈ max_px / x_norm
            w = max(xs) + 1 if xs else 640
            h = max(ys) + 1 if ys else 480
        else:
            w, h = 640, 480

        return [
            (
                int(min(max(lm["x"] * w, 0), w - 1)),
                int(min(max(lm["y"] * h, 0), h - 1)),
            )
            for lm in smoothed_raw
        ]


# ---------------------------------------------------------------------------
# Convenience: wrap M01 get_landmarks with smoothing in one call
# ---------------------------------------------------------------------------
def make_smooth_pipeline(Q: float = 0.01, R: float = 0.1):
    """
    Returns a stateful function  process(frame) → smoothed pose_data dict.

    Example
    -------
        process = make_smooth_pipeline()
        while cap.isOpened():
            ok, frame = cap.read()
            data = process(frame)          # already smoothed
    """
    from importlib import import_module
    m01 = import_module("01_blazepose") if False else None  # resolved at call time

    smoother = LandmarkSmoother(Q=Q, R=R)

    def process(frame):
        # Lazy import so 02_kalman.py works even without 01_blazepose.py on path
        import importlib, sys, os
        _dir = os.path.dirname(os.path.abspath(__file__))
        if _dir not in sys.path:
            sys.path.insert(0, _dir)
        mod_name = "01_blazepose"
        if mod_name not in sys.modules:
            import importlib.util
            spec = importlib.util.spec_from_file_location(
                mod_name, os.path.join(_dir, "01_blazepose.py"))
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            sys.modules[mod_name] = mod
        else:
            mod = sys.modules[mod_name]
        timestamp_ms = int(time.time() * 1000)
        raw_data = mod.get_landmarks(frame, timestamp_ms)
        return smoother.smooth(raw_data)

    return process


# ---------------------------------------------------------------------------
# Standalone demo  (python 02_kalman.py)
# ---------------------------------------------------------------------------
def _run_demo():
    import importlib.util, sys, os, cv2

    _dir = os.path.dirname(os.path.abspath(__file__))
    spec = importlib.util.spec_from_file_location(
        "blazepose_m01", os.path.join(_dir, "01_blazepose.py"))
    m01 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m01)

    smoother  = LandmarkSmoother()
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Cannot open webcam.")
        return

    print("M02 Kalman smoother demo — press Q to quit, R to reset filters.")
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        timestamp_ms = int(time.time() * 1000)
        raw_data    = m01.get_landmarks(frame, timestamp_ms)
        smooth_data = smoother.smooth(raw_data)

        # Draw skeleton using smoothed landmarks
        m01.draw_skeleton(frame, smooth_data)

        status = "DETECTED" if smooth_data["detected"] else "NO POSE"
        cv2.putText(frame, f"M02 Kalman | {status}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    (0, 255, 0) if smooth_data["detected"] else (0, 0, 255),
                    2, cv2.LINE_AA)

        cv2.imshow("M02 — Kalman Smoother", frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        elif key == ord("r"):
            smoother.reset()
            print("Filters reset.")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    _run_demo()
