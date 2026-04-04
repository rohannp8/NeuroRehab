"""
M03 — Isolation Forest exercise form checker

Trains one anomaly detector per exercise using only CORRECT/RIGHT samples.
Uses M01 landmark extraction + M02 Kalman smoothing to build stable angle features.

Usage:
    python 03_anomaly.py --dataset-dir "C:/Dataset" --output-dir "models"

Inference API:
    checker = FormChecker.load("models/anomaly_arm_extension.joblib")
    is_good = checker.check_form(angle_dict)
"""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
from typing import Any

import cv2
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest


DEFAULT_ANGLE_FEATURES = [
    "left_elbow",
    "right_elbow",
    "left_shoulder",
    "right_shoulder",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
]

VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".m4v", ".webm"}

FINGER_TAP_FEATURES = [
    "hand_pinch_thumb_index",
    "hand_pinch_thumb_middle",
    "hand_pinch_thumb_ring",
    "hand_pinch_thumb_pinky",
    "hand_curl_thumb",
    "hand_curl_index",
    "hand_curl_middle",
    "hand_curl_ring",
    "hand_curl_pinky",
]


def _dist(p1: tuple[int, int], p2: tuple[int, int]) -> float:
    return float(np.hypot(p1[0] - p2[0], p1[1] - p2[1]))


def _angle_2d(a: tuple[int, int], v: tuple[int, int], b: tuple[int, int]) -> float:
    ax, ay = a[0] - v[0], a[1] - v[1]
    bx, by = b[0] - v[0], b[1] - v[1]
    dot = ax * bx + ay * by
    mag_a = np.hypot(ax, ay)
    mag_b = np.hypot(bx, by)
    if mag_a < 1e-6 or mag_b < 1e-6:
        return 180.0
    cos_val = float(np.clip(dot / (mag_a * mag_b), -1.0, 1.0))
    return float(np.degrees(np.arccos(cos_val)))


def _select_primary_hand(hands: list[list[tuple[int, int]]] | None) -> list[tuple[int, int]] | None:
    if not hands:
        return None

    def area(hand: list[tuple[int, int]]) -> float:
        xs = [p[0] for p in hand]
        ys = [p[1] for p in hand]
        return float((max(xs) - min(xs) + 1) * (max(ys) - min(ys) + 1))

    return max(hands, key=area)


def _extract_hand_geometry_features(
    hand_landmarks_px: list[list[tuple[int, int]]] | None,
) -> dict[str, float]:
    hand = _select_primary_hand(hand_landmarks_px)
    if hand is None or len(hand) < 21:
        return {}

    # Normalize distances by palm size to reduce camera distance effects.
    palm_scale = max(_dist(hand[0], hand[9]), 1.0)

    # Curl proxy: 0 = fully straight, larger = more bent.
    thumb_curl = max(0.0, 180.0 - _angle_2d(hand[1], hand[2], hand[4])) / 180.0
    index_curl = max(0.0, 180.0 - _angle_2d(hand[5], hand[6], hand[8])) / 180.0
    middle_curl = max(0.0, 180.0 - _angle_2d(hand[9], hand[10], hand[12])) / 180.0
    ring_curl = max(0.0, 180.0 - _angle_2d(hand[13], hand[14], hand[16])) / 180.0
    pinky_curl = max(0.0, 180.0 - _angle_2d(hand[17], hand[18], hand[20])) / 180.0

    return {
        "hand_pinch_thumb_index": _dist(hand[4], hand[8]) / palm_scale,
        "hand_pinch_thumb_middle": _dist(hand[4], hand[12]) / palm_scale,
        "hand_pinch_thumb_ring": _dist(hand[4], hand[16]) / palm_scale,
        "hand_pinch_thumb_pinky": _dist(hand[4], hand[20]) / palm_scale,
        "hand_curl_thumb": thumb_curl,
        "hand_curl_index": index_curl,
        "hand_curl_middle": middle_curl,
        "hand_curl_ring": ring_curl,
        "hand_curl_pinky": pinky_curl,
    }


def _is_hand_feature_set(feature_names: list[str]) -> bool:
    return any(name.startswith("hand_") for name in feature_names)


def _load_module(module_name: str, file_path: Path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module {module_name} from {file_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _slugify(name: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "_" for ch in name).strip("_")


def _find_label_dir(exercise_dir: Path, candidates: list[str]) -> Path | None:
    for c in candidates:
        p = exercise_dir / c
        if p.exists() and p.is_dir():
            return p
    return None


def _iter_video_files(folder: Path):
    for p in sorted(folder.rglob("*")):
        if p.is_file() and p.suffix.lower() in VIDEO_EXTS:
            yield p


def _feature_set_for_exercise(exercise_name: str) -> list[str]:
    name = exercise_name.lower()
    if "finger" in name:
        return FINGER_TAP_FEATURES
    if "arm" in name:
        return ["left_elbow", "right_elbow", "left_shoulder", "right_shoulder"]
    if "leg" in name or "sit" in name:
        return ["left_hip", "right_hip", "left_knee", "right_knee"]
    return DEFAULT_ANGLE_FEATURES


def _extract_feature_rows_from_video(
    video_path: Path,
    m01: Any,
    smoother: Any,
    feature_names: list[str],
    frame_stride: int,
    start_timestamp_ms: int,
) -> tuple[np.ndarray, int]:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return np.empty((0, len(feature_names)), dtype=np.float32), start_timestamp_ms

    rows = []
    frame_idx = 0
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 1e-6:
        fps = 30.0
    step_ms = max(1, int(1000.0 / fps))
    timestamp_ms = int(start_timestamp_ms)
    last_valid: dict[str, float | None] = {k: None for k in feature_names}
    uses_hand_features = _is_hand_feature_set(feature_names)

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame_idx += 1
        if frame_idx % frame_stride != 0:
            continue

        timestamp_ms += step_ms * frame_stride
        data = m01.get_landmarks(frame, timestamp_ms)
        data = smoother.smooth(data)

        if not data.get("detected", False) and not uses_hand_features:
            continue

        if uses_hand_features:
            current_features = _extract_hand_geometry_features(data.get("hand_landmarks_px"))
        else:
            current_features = data.get("joint_angles", {})

        vals = []
        missing = 0
        for name in feature_names:
            v = current_features.get(name)
            if v is None:
                v = last_valid[name]
            if v is None:
                missing += 1
                vals.append(None)
            else:
                fv = float(v)
                vals.append(fv)
                last_valid[name] = fv

        # Skip heavily occluded frames.
        if missing > max(1, len(feature_names) // 2):
            continue

        if any(v is None for v in vals):
            non_missing = [v for v in vals if v is not None]
            if not non_missing:
                continue
            fill = float(np.mean(non_missing))
            vals = [fill if v is None else v for v in vals]

        rows.append(vals)

    cap.release()

    if not rows:
        return np.empty((0, len(feature_names)), dtype=np.float32), timestamp_ms
    return np.asarray(rows, dtype=np.float32), timestamp_ms


def _train_one_exercise(
    exercise_dir: Path,
    m01: Any,
    m02: Any,
    output_dir: Path,
    contamination: float,
    frame_stride: int,
    random_state: int,
    start_timestamp_ms: int,
) -> tuple[dict[str, Any], int]:
    normal_dir = _find_label_dir(exercise_dir, ["Correct", "Right"])
    anomaly_dir = _find_label_dir(exercise_dir, ["Wrong"])
    feature_names = _feature_set_for_exercise(exercise_dir.name)

    if normal_dir is None:
        return {
            "exercise": exercise_dir.name,
            "status": "skipped",
            "reason": "No Correct/Right folder found",
        }, start_timestamp_ms

    normal_videos = list(_iter_video_files(normal_dir))
    if not normal_videos:
        return {
            "exercise": exercise_dir.name,
            "status": "skipped",
            "reason": "No training videos in Correct/Right folder",
        }, start_timestamp_ms

    smoother = m02.LandmarkSmoother()
    running_ts = int(start_timestamp_ms)
    train_chunks = []
    for video in normal_videos:
        smoother.reset()
        rows, running_ts = _extract_feature_rows_from_video(
            video, m01, smoother, feature_names, frame_stride, running_ts
        )
        running_ts += 1000
        if len(rows):
            train_chunks.append(rows)

    if not train_chunks:
        return {
            "exercise": exercise_dir.name,
            "status": "skipped",
            "reason": "No detectable pose-angle samples were extracted",
            "feature_names": feature_names,
        }, running_ts

    X_train = np.vstack(train_chunks)

    model = IsolationForest(
        n_estimators=300,
        contamination=contamination,
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X_train)

    exercise_slug = _slugify(exercise_dir.name)
    model_path = output_dir / f"anomaly_{exercise_slug}.joblib"

    artifact = {
        "exercise": exercise_dir.name,
        "exercise_slug": exercise_slug,
        "feature_names": feature_names,
        "contamination": contamination,
        "model": model,
    }
    joblib.dump(artifact, model_path)

    eval_stats = {}

    train_pred = model.predict(X_train)
    train_good_rate = float((train_pred == 1).mean())
    eval_stats["train_samples"] = int(X_train.shape[0])
    eval_stats["train_good_rate"] = train_good_rate

    if anomaly_dir is not None:
        wrong_videos = list(_iter_video_files(anomaly_dir))
        if wrong_videos:
            smoother = m02.LandmarkSmoother()
            wrong_chunks = []
            for video in wrong_videos:
                smoother.reset()
                rows, running_ts = _extract_feature_rows_from_video(
                    video, m01, smoother, feature_names, frame_stride, running_ts
                )
                running_ts += 1000
                if len(rows):
                    wrong_chunks.append(rows)

            if wrong_chunks:
                X_wrong = np.vstack(wrong_chunks)
                wrong_pred = model.predict(X_wrong)
                eval_stats["wrong_samples"] = int(X_wrong.shape[0])
                eval_stats["wrong_flagged_rate"] = float((wrong_pred == -1).mean())

    return {
        "exercise": exercise_dir.name,
        "status": "trained",
        "model_path": str(model_path),
        "metrics": eval_stats,
    }, running_ts


class FormChecker:
    """Lightweight runtime helper for model inference."""

    def __init__(self, artifact: dict[str, Any]):
        self._artifact = artifact
        self._model = artifact["model"]
        self._features = artifact["feature_names"]

    @classmethod
    def load(cls, model_path: str | Path) -> "FormChecker":
        artifact = joblib.load(model_path)
        return cls(artifact)

    @property
    def feature_names(self) -> list[str]:
        return list(self._features)

    def _build_feature_vector(
        self,
        angles_dict: dict[str, float | None],
        hand_landmarks_px: list[list[tuple[int, int]]] | None = None,
    ) -> np.ndarray | None:
        # If caller passes a ready feature dict, use it directly.
        if all(k in angles_dict for k in self._features):
            source = angles_dict
        elif _is_hand_feature_set(self._features):
            source = _extract_hand_geometry_features(hand_landmarks_px)
        else:
            source = angles_dict

        vals = []
        for k in self._features:
            v = source.get(k)
            if v is None:
                return None
            vals.append(float(v))
        return np.asarray(vals, dtype=np.float32).reshape(1, -1)

    def check_form(
        self,
        angles_dict: dict[str, float | None],
        hand_landmarks_px: list[list[tuple[int, int]]] | None = None,
    ) -> bool:
        x = self._build_feature_vector(angles_dict, hand_landmarks_px)
        if x is None:
            return False
        pred = self._model.predict(x)[0]
        return bool(pred == 1)

    def anomaly_score(
        self,
        angles_dict: dict[str, float | None],
        hand_landmarks_px: list[list[tuple[int, int]]] | None = None,
    ) -> float | None:
        x = self._build_feature_vector(angles_dict, hand_landmarks_px)
        if x is None:
            return None
        # IsolationForest decision_function: higher is more normal.
        return float(self._model.decision_function(x)[0])


def run_camera_test(
    model_path: Path,
    camera_index: int = 0,
):
    project_dir = Path(__file__).resolve().parent
    m01 = _load_module("m01_blazepose", project_dir / "01_blazepose.py")
    m02 = _load_module("m02_kalman", project_dir / "02_kalman.py")

    checker = FormChecker.load(model_path)
    smoother = m02.LandmarkSmoother()

    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open webcam index {camera_index}")

    print("M03 camera test running. Press Q to quit.")
    print(f"Model: {model_path}")
    print(f"Features: {checker.feature_names}")

    timestamp_ms = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        timestamp_ms += 33
        raw_data = m01.get_landmarks(frame, timestamp_ms)
        smooth_data = smoother.smooth(raw_data)

        frame = m01.draw_skeleton(frame, smooth_data)

        is_good = checker.check_form(
            smooth_data.get("joint_angles", {}),
            hand_landmarks_px=smooth_data.get("hand_landmarks_px"),
        )
        score = checker.anomaly_score(
            smooth_data.get("joint_angles", {}),
            hand_landmarks_px=smooth_data.get("hand_landmarks_px"),
        )

        status = "GOOD FORM" if is_good else "BAD FORM"
        color = (0, 255, 0) if is_good else (0, 0, 255)

        cv2.putText(
            frame,
            f"M03 | {status}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            color,
            2,
            cv2.LINE_AA,
        )

        score_text = "n/a" if score is None else f"{score:+.3f}"
        cv2.putText(
            frame,
            f"anomaly_score: {score_text}",
            (10, 56),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

        cv2.imshow("M03 - Isolation Forest Camera Test", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


def train_all_models(
    dataset_dir: Path,
    output_dir: Path,
    contamination: float = 0.05,
    frame_stride: int = 3,
    random_state: int = 42,
) -> list[dict[str, Any]]:
    project_dir = Path(__file__).resolve().parent
    m01 = _load_module("m01_blazepose", project_dir / "01_blazepose.py")
    m02 = _load_module("m02_kalman", project_dir / "02_kalman.py")

    output_dir.mkdir(parents=True, exist_ok=True)

    summaries = []
    global_ts = 0
    for exercise_dir in sorted(dataset_dir.iterdir()):
        if not exercise_dir.is_dir():
            continue
        s, global_ts = _train_one_exercise(
            exercise_dir=exercise_dir,
            m01=m01,
            m02=m02,
            output_dir=output_dir,
            contamination=contamination,
            frame_stride=frame_stride,
            random_state=random_state,
            start_timestamp_ms=global_ts,
        )
        global_ts += 1000
        summaries.append(s)

    return summaries


def main():
    parser = argparse.ArgumentParser(description="Train Isolation Forest form-check models")
    parser.add_argument("--dataset-dir", default="C:/Dataset", help="Dataset root path")
    parser.add_argument("--output-dir", default="models", help="Directory to save .joblib models")
    parser.add_argument("--contamination", type=float, default=0.05)
    parser.add_argument("--frame-stride", type=int, default=3, help="Use every Nth frame")
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--camera-test", action="store_true", help="Run live webcam test")
    parser.add_argument("--exercise", default="finger_tapping", help="Exercise slug for camera test")
    parser.add_argument("--model-path", default="", help="Explicit model path for camera test")
    parser.add_argument("--camera-index", type=int, default=0, help="Webcam index")
    args = parser.parse_args()

    if args.camera_test:
        if args.model_path:
            model_path = Path(args.model_path)
        else:
            model_path = Path(args.output_dir) / f"anomaly_{_slugify(args.exercise)}.joblib"

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model not found: {model_path}. Train first or pass --model-path."
            )

        run_camera_test(model_path=model_path, camera_index=args.camera_index)
        return

    dataset_dir = Path(args.dataset_dir)
    output_dir = Path(args.output_dir)

    if not dataset_dir.exists():
        raise FileNotFoundError(f"Dataset directory not found: {dataset_dir}")

    summaries = train_all_models(
        dataset_dir=dataset_dir,
        output_dir=output_dir,
        contamination=args.contamination,
        frame_stride=max(1, args.frame_stride),
        random_state=args.random_state,
    )

    print("\nTraining summary:")
    for s in summaries:
        if s["status"] == "trained":
            metrics = s.get("metrics", {})
            print(
                f"- {s['exercise']}: trained | model={s['model_path']} | "
                f"train_samples={metrics.get('train_samples', 0)} | "
                f"train_good_rate={metrics.get('train_good_rate', 0.0):.3f} | "
                f"wrong_flagged_rate={metrics.get('wrong_flagged_rate', float('nan')):.3f}"
            )
        else:
            print(f"- {s['exercise']}: {s['status']} ({s.get('reason', '')})")

    report_path = output_dir / "training_report.json"
    report_path.write_text(json.dumps(summaries, indent=2), encoding="utf-8")
    print(f"\nSaved report: {report_path}")


if __name__ == "__main__":
    main()
