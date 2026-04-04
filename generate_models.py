"""
NeuroRehab AI — Model Generator Script
=======================================
Run this ONCE from the project root:
    python generate_models.py

What it does:
  1. Deletes the empty `models` file (if present)
  2. Creates the `models/` directory
  3. Trains lightweight synthetic models and saves them as .pkl files
     in the EXACT format expected by model_loader.py and all wrapper classes

Generated files:
  models/kalman_filter.pkl       ← dict config (used by 02_kalman.py)
  models/random_forest.pkl       ← sklearn RandomForestClassifier (8 joint features)
  models/isolation_forest.pkl    ← artifact dict {model, feature_names} (for FormChecker)
  models/xgboost.pkl             ← sklearn GradientBoostingRegressor (recovery predictor)
  models/bayesian_model.pkl      ← sklearn GaussianNB (adaptive difficulty)
  models/dqn_model.pkl           ← dict of Q-table (DQN schedule agent)
"""

import os
import sys
import shutil
import numpy as np
import joblib

# ─── Paths ────────────────────────────────────────────────────────────────────

ROOT_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(ROOT_DIR, "models")

# ─── Step 1: Fix the `models` file/folder situation ───────────────────────────

models_path = os.path.join(ROOT_DIR, "models")
if os.path.isfile(models_path):
    print("⚠️  Found 'models' as an empty FILE. Deleting it...")
    os.remove(models_path)

os.makedirs(MODELS_DIR, exist_ok=True)
print(f"✅ models/ directory ready at: {MODELS_DIR}\n")

# ─── Shared feature schema (must match M05 + M03 wrappers) ────────────────────

JOINT_FEATURES = [
    "left_elbow", "left_hip", "left_knee", "left_shoulder",
    "right_elbow", "right_hip", "right_knee", "right_shoulder",
]

EXERCISE_LABELS = [
    "shoulder_flexion", "knee_extension", "elbow_curl",
    "hip_abduction", "wrist_rotation", "ankle_dorsiflexion",
]

# ─── Synthetic data helpers ────────────────────────────────────────────────────

def make_angle_data(n=600):
    """Generate synthetic joint angle arrays (0–180°) for 8 joints."""
    return np.random.uniform(10, 170, size=(n, len(JOINT_FEATURES))).astype(np.float32)

def make_labels(n=600):
    """Generate synthetic exercise labels cycling through all exercise types."""
    return np.array([EXERCISE_LABELS[i % len(EXERCISE_LABELS)] for i in range(n)])

# ═══════════════════════════════════════════════════════════════════════════════
# MODEL 1 — Kalman Filter config dict
# ═══════════════════════════════════════════════════════════════════════════════

print("📦 [1/6] Generating kalman_filter.pkl ...")
kalman_artifact = {
    "process_noise": 1e-3,
    "measurement_noise": 1e-1,
    "num_landmarks": 33,
    "description": "Kalman smoother config — used by LandmarkSmoother in 02_kalman.py",
}
path = os.path.join(MODELS_DIR, "kalman_filter.pkl")
joblib.dump(kalman_artifact, path)
print(f"   ✅ Saved → {path}")

# ═══════════════════════════════════════════════════════════════════════════════
# MODEL 2 — Random Forest Classifier (M05)
# Input:  8 joint angles  →  Output: exercise label
# ═══════════════════════════════════════════════════════════════════════════════

print("\n📦 [2/6] Generating random_forest.pkl ...")
from sklearn.ensemble import RandomForestClassifier

X_rf = make_angle_data(800)
y_rf = make_labels(800)

rf_model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
rf_model.fit(X_rf, y_rf)

path = os.path.join(MODELS_DIR, "random_forest.pkl")
joblib.dump(rf_model, path)
print(f"   ✅ Saved → {path}")
print(f"   Classes: {rf_model.classes_}")
print(f"   Train accuracy: {rf_model.score(X_rf, y_rf)*100:.1f}%")

# ═══════════════════════════════════════════════════════════════════════════════
# MODEL 3 — Isolation Forest artifact dict (M03 FormChecker)
# IMPORTANT: Must be saved as {"model": ..., "feature_names": [...]}
# This exact format is what FormChecker.__init__ expects
# ═══════════════════════════════════════════════════════════════════════════════

print("\n📦 [3/6] Generating isolation_forest.pkl ...")
from sklearn.ensemble import IsolationForest

# Train only on "correct form" — use tighter angle ranges (40°–140°) to simulate good ROM
X_iso = np.random.uniform(40, 140, size=(500, len(JOINT_FEATURES))).astype(np.float32)

iso_model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42, n_jobs=-1)
iso_model.fit(X_iso)

# Wrap in artifact dict (required by FormChecker class in 03_anomaly.py)
iso_artifact = {
    "model":         iso_model,
    "feature_names": JOINT_FEATURES,
    "exercise":      "general",
    "exercise_slug": "general",
    "contamination": 0.05,
}
path = os.path.join(MODELS_DIR, "isolation_forest.pkl")
joblib.dump(iso_artifact, path)
print(f"   ✅ Saved → {path}")
print(f"   Features: {JOINT_FEATURES}")

# ═══════════════════════════════════════════════════════════════════════════════
# MODEL 4 — XGBoost-style Recovery Predictor (M10)
# Input:  [avg_deviation, completion_rate, fatigue_score]  →  Output: weeks to recovery
# Using sklearn GradientBoostingRegressor as drop-in (same API as XGBoost .pkl)
# ═══════════════════════════════════════════════════════════════════════════════

print("\n📦 [4/6] Generating xgboost.pkl ...")
from sklearn.ensemble import GradientBoostingRegressor

# Synthetic: higher deviation + lower completion = more recovery weeks needed
n = 400
deviation     = np.random.uniform(5, 45, n)
completion    = np.random.uniform(0.3, 1.0, n)
fatigue       = np.random.uniform(10, 90, n)
weeks         = np.clip(deviation * 0.4 - completion * 8 + fatigue * 0.1 + 6, 1, 24)

X_xgb = np.column_stack([deviation, completion, fatigue])
y_xgb = weeks.astype(np.float32)

xgb_model = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
xgb_model.fit(X_xgb, y_xgb)

path = os.path.join(MODELS_DIR, "xgboost.pkl")
joblib.dump(xgb_model, path)
print(f"   ✅ Saved → {path}")
print(f"   Input: [avg_deviation, completion_rate, fatigue_score] → weeks_remaining")

# ═══════════════════════════════════════════════════════════════════════════════
# MODEL 5 — Bayesian Adaptive Difficulty (M11)
# Input:  [avg_deviation, completion_rate, fatigue]  →  Output: difficulty class
# ═══════════════════════════════════════════════════════════════════════════════

print("\n📦 [5/6] Generating bayesian_model.pkl ...")
from sklearn.naive_bayes import GaussianNB

n = 400
deviation     = np.random.uniform(5, 45, n)
completion    = np.random.uniform(0.3, 1.0, n)
fatigue       = np.random.uniform(10, 90, n)

# Label: 0=Decrease, 1=Maintain, 2=Increase
labels_bayes = np.where(fatigue > 70, 0, np.where(completion > 0.85, 2, 1))

X_bayes = np.column_stack([deviation, completion, fatigue])
bayes_model = GaussianNB()
bayes_model.fit(X_bayes, labels_bayes)

path = os.path.join(MODELS_DIR, "bayesian_model.pkl")
joblib.dump(bayes_model, path)
print(f"   ✅ Saved → {path}")
print(f"   Classes: 0=Decrease, 1=Maintain, 2=Increase")

# ═══════════════════════════════════════════════════════════════════════════════
# MODEL 6 — DQN Notification Agent (M09)
# Saved as a Q-table dict (mock RL policy)
# Real DQN weights would be .zip from stable-baselines3
# ═══════════════════════════════════════════════════════════════════════════════

print("\n📦 [6/6] Generating dqn_model.pkl ...")

# Q-table: states are (frequency_band, time_of_day_band) → best_notification_hour
# frequency_bands: 0=low(<0.3), 1=mid(0.3-0.8), 2=high(>0.8)
dqn_artifact = {
    "type": "q_table",
    "q_table": {
        "low_frequency":  {"best_hour": 10, "q_value": 0.76},
        "mid_frequency":  {"best_hour": 14, "q_value": 0.82},
        "high_frequency": {"best_hour": 17, "q_value": 0.91},
    },
    "action_space":   list(range(24)),   # hours 0-23
    "description": "DQN Q-table for optimal notification hour selection",
}
path = os.path.join(MODELS_DIR, "dqn_model.pkl")
joblib.dump(dqn_artifact, path)
print(f"   ✅ Saved → {path}")

# ═══════════════════════════════════════════════════════════════════════════════
# MODEL 7 — GRU Digital Twin (M04)
# Input: (1, 30, 8) — 30-frame window of 8 joint angles
# Output: [predicted_rom, fatigue_score, target_angle]
# Tries keras — falls back to a lightweight numpy weight dict if TF not installed
# ═══════════════════════════════════════════════════════════════════════════════

print("\n📦 [7/8] Generating gru_model.h5 ...")
try:
    import tensorflow as tf
    from tensorflow import keras

    gru_model = keras.Sequential([
        keras.layers.Input(shape=(30, 8)),
        keras.layers.GRU(64, return_sequences=False),
        keras.layers.Dense(32, activation="relu"),
        keras.layers.Dense(3),   # [predicted_rom, fatigue_score, target_angle]
    ])
    gru_model.compile(optimizer="adam", loss="mse")

    # Quick synthetic training so weights aren't completely random
    X_gru = np.random.uniform(10, 170, (200, 30, 8)).astype(np.float32)
    y_gru = np.column_stack([
        np.random.uniform(60, 150, 200),   # ROM
        np.random.uniform(0, 100, 200),    # fatigue
        np.full(200, 90.0),                # target angle
    ]).astype(np.float32)
    gru_model.fit(X_gru, y_gru, epochs=3, verbose=0)

    path = os.path.join(MODELS_DIR, "gru_model.h5")
    gru_model.save(path)
    print(f"   ✅ Saved (Keras) → {path}")

except ImportError:
    # TensorFlow not installed — save numpy weight dict as pkl fallback
    print("   ⚠️  TensorFlow not found. Saving lightweight numpy fallback...")
    gru_fallback = {
        "type": "gru_numpy_fallback",
        "input_shape": (30, 8),
        "output_shape": (3,),
        "weights": {
            "W": np.random.randn(8, 64).astype(np.float32) * 0.01,
            "U": np.random.randn(64, 64).astype(np.float32) * 0.01,
            "b": np.zeros(64, dtype=np.float32),
            "dense_W": np.random.randn(64, 3).astype(np.float32) * 0.01,
            "dense_b": np.array([90.0, 15.0, 90.0], dtype=np.float32),  # ROM, fatigue, target
        },
        "description": "GRU Digital Twin mock weights — replace with real .h5 when TF available",
    }
    path = os.path.join(MODELS_DIR, "gru_model.h5")  # save as .h5 name but pkl contents
    joblib.dump(gru_fallback, path)
    print(f"   ✅ Saved (numpy fallback) → {path}")

# ═══════════════════════════════════════════════════════════════════════════════
# MODEL 8 — LSTM Cognitive Scorer (M06)
# Input: (1, 30, 1) — 30-frame sequence of deviation scores
# Output: [cognitive_score (0-100)]
# ═══════════════════════════════════════════════════════════════════════════════

print("\n📦 [8/8] Generating lstm_model.h5 ...")
try:
    import tensorflow as tf
    from tensorflow import keras

    lstm_model = keras.Sequential([
        keras.layers.Input(shape=(30, 1)),
        keras.layers.LSTM(32, return_sequences=False),
        keras.layers.Dense(16, activation="relu"),
        keras.layers.Dense(1, activation="sigmoid"),  # 0–1 normalized cognitive score
    ])
    lstm_model.compile(optimizer="adam", loss="mse")

    X_lstm = np.random.uniform(0, 50, (200, 30, 1)).astype(np.float32)
    y_lstm = np.random.uniform(0, 1, (200, 1)).astype(np.float32)
    lstm_model.fit(X_lstm, y_lstm, epochs=3, verbose=0)

    path = os.path.join(MODELS_DIR, "lstm_model.h5")
    lstm_model.save(path)
    print(f"   ✅ Saved (Keras) → {path}")

except ImportError:
    print("   ⚠️  TensorFlow not found. Saving lightweight numpy fallback...")
    lstm_fallback = {
        "type": "lstm_numpy_fallback",
        "input_shape": (30, 1),
        "output_shape": (1,),
        "weights": {
            "W": np.random.randn(1, 32).astype(np.float32) * 0.01,
            "U": np.random.randn(32, 32).astype(np.float32) * 0.01,
            "b": np.zeros(32, dtype=np.float32),
            "dense_W": np.random.randn(32, 1).astype(np.float32) * 0.01,
            "dense_b": np.array([0.85], dtype=np.float32),
        },
        "description": "LSTM Cognitive Scorer mock weights — replace with real .h5 when TF available",
    }
    path = os.path.join(MODELS_DIR, "lstm_model.h5")
    joblib.dump(lstm_fallback, path)
    print(f"   ✅ Saved (numpy fallback) → {path}")

# ─── Summary ──────────────────────────────────────────────────────────────────

print("\n" + "="*60)
print("✅  ALL MODELS GENERATED SUCCESSFULLY")
print("="*60)
saved = [f for f in os.listdir(MODELS_DIR)]
for f in sorted(saved):
    size = os.path.getsize(os.path.join(MODELS_DIR, f))
    print(f"   📁 models/{f}  ({size/1024:.1f} KB)")

print("""
📋 Model Summary (all 12):
  M01 BlazePose       → No file needed (MediaPipe loads at runtime)
  M02 Kalman Filter   → models/kalman_filter.pkl       ✅
  M03 Isolation Forest→ models/isolation_forest.pkl    ✅
  M04 GRU Twin        → models/gru_model.h5            ✅
  M05 Random Forest   → models/random_forest.pkl       ✅
  M06 LSTM Cognitive  → models/lstm_model.h5           ✅
  M07 Coqui TTS       → No file needed (downloads at runtime)
  M08 mBART           → No file needed (HuggingFace downloads)
  M09 DQN Agent       → models/dqn_model.pkl           ✅
  M10 XGBoost         → models/xgboost.pkl             ✅
  M11 Bayesian        → models/bayesian_model.pkl      ✅
  M12 DeepFace        → No file needed (library handles CNN weights)

🚀 Restart the backend:  cd backend && python main.py
""")
