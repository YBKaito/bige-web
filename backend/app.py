"""
BIGE Web Backend
Flask API that serves motion generation results.
Currently runs in MOCK mode - plug in real model when checkpoints are available.
"""

import os
import sys
import json
import random
import numpy as np
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Mode toggle ──────────────────────────────────────────────────────────────
MOCK_MODE = True  # Set False once you have checkpoints + dataset

# ── Optional: import real BIGE model when available ──────────────────────────
# BIGE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../BIGE'))
# PG_BIGE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../PG-BIGE'))
# sys.path.insert(0, BIGE_PATH)
# sys.path.insert(0, PG_BIGE_PATH)
# from LIMO_Surrogate import run_inference   ← uncomment when ready


# ─────────────────────────────────────────────────────────────────────────────
# Mock data generators
# ─────────────────────────────────────────────────────────────────────────────

def mock_metrics(activation_level, model="bige"):
    """Generate plausible mock metrics based on activation target."""
    base = {
        "low":    {"squat_depth": 58, "muscle_activation": 32, "temporal_consistency": 81, "reconstruction_loss": 64, "perplexity": 71, "diversity_score": 78, "similarity_score": 74},
        "medium": {"squat_depth": 72, "muscle_activation": 52, "temporal_consistency": 85, "reconstruction_loss": 72, "perplexity": 78, "diversity_score": 82, "similarity_score": 80},
        "high":   {"squat_depth": 85, "muscle_activation": 74, "temporal_consistency": 89, "reconstruction_loss": 80, "perplexity": 84, "diversity_score": 86, "similarity_score": 88},
    }
    m = base.get(activation_level, base["medium"]).copy()
    # PG-BIGE is consistently a bit better
    if model == "pg_bige":
        m = {k: min(99, v + random.randint(8, 16)) for k, v in m.items()}
    else:
        m = {k: v + random.randint(-3, 3) for k, v in m.items()}
    return m


def mock_joint_trajectory(n_frames=49, activation_level="medium", depth_deg=90):
    """
    Generate synthetic joint angle trajectories that look like a squat.
    Returns dict of joint -> list of angles (degrees) over time.
    """
    t = np.linspace(0, 2 * np.pi, n_frames)
    squat_curve = np.sin(t / 2) ** 2  # 0→1→0 over the cycle

    scale = {"low": 0.6, "medium": 1.0, "high": 1.3}.get(activation_level, 1.0)
    depth_scale = depth_deg / 90.0

    knee_flex   = squat_curve * 95 * scale * depth_scale
    hip_flex    = squat_curve * 75 * scale * depth_scale
    ankle_dors  = squat_curve * 25 * scale
    pelvis_tilt = squat_curve * 12 * scale

    noise = lambda: np.random.normal(0, 1.5, n_frames)

    return {
        "time":         np.linspace(0, 2.0, n_frames).tolist(),
        "knee_flex_l":  (knee_flex + noise()).tolist(),
        "knee_flex_r":  (knee_flex + noise()).tolist(),
        "hip_flex_l":   (hip_flex  + noise()).tolist(),
        "hip_flex_r":   (hip_flex  + noise()).tolist(),
        "ankle_dors_l": (ankle_dors + noise()).tolist(),
        "ankle_dors_r": (ankle_dors + noise()).tolist(),
        "pelvis_tilt":  (pelvis_tilt + noise()).tolist(),
    }


def mock_frame_snapshots(n_frames=49, activation_level="medium", depth_deg=90):
    """Return pose data for 4 key frames across the squat cycle."""
    traj = mock_joint_trajectory(n_frames, activation_level, depth_deg)
    key_indices = [0, n_frames//4, n_frames//2, 3*n_frames//4]
    snapshots = []
    for i, idx in enumerate(key_indices):
        snapshots.append({
            "frame_index": idx,
            "cycle_pct": i * 25,
            "knee_flex":   round((traj["knee_flex_l"][idx] + traj["knee_flex_r"][idx]) / 2, 1),
            "hip_flex":    round((traj["hip_flex_l"][idx]  + traj["hip_flex_r"][idx])  / 2, 1),
            "ankle_dors":  round((traj["ankle_dors_l"][idx]+ traj["ankle_dors_r"][idx])/ 2, 1),
            "pelvis_tilt": round(traj["pelvis_tilt"][idx], 1),
            "activation_pct": round(abs(np.sin(idx / n_frames * np.pi)) * 100 *
                                {"low": 0.35, "medium": 0.55, "high": 0.80}[activation_level], 1),
        })
    return snapshots


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "mock_mode": MOCK_MODE})


@app.route("/api/generate", methods=["POST"])
def generate():
    """
    Main generation endpoint.
    Body (JSON):
      - activation_level: "low" | "medium" | "high"
      - height_cm: int
      - mass_kg: int
      - squat_depth_deg: int
      - exercise_type: str
      - pelvis_tilt: str
      - vastus_range: int   (0-100)
      - com_velocity: str
      - angular_velocity: str
      - age: int
      - sport: str
    Returns joint trajectories + metrics for both BIGE and PG-BIGE.
    """
    data = request.get_json(force=True)
    activation = data.get("activation_level", "medium")
    depth      = int(data.get("squat_depth_deg", 90))
    n_frames   = 49

    if MOCK_MODE:
        result = {
            "mock": True,
            "bige": {
                "metrics":   mock_metrics(activation, model="bige"),
                "frames":    mock_frame_snapshots(n_frames, activation, depth),
                "trajectory": mock_joint_trajectory(n_frames, activation, depth),
            },
            "pg_bige": {
                "metrics":   mock_metrics(activation, model="pg_bige"),
                "frames":    mock_frame_snapshots(n_frames, activation, depth),
                "trajectory": mock_joint_trajectory(n_frames, activation, depth),
            },
        }
    else:
        # ── Real inference (fill in when checkpoints arrive) ──────────────
        # bige_mot   = run_bige_inference(data)
        # pgbige_mot = run_pgbige_inference(data)
        # result = { "bige": parse_mot(bige_mot), "pg_bige": parse_mot(pgbige_mot) }
        raise NotImplementedError("Real model not wired up yet.")

    return jsonify(result)


@app.route("/api/subjects")
def subjects():
    """List available subjects (mock)."""
    mock_subjects = [
        {"id": "S001", "age": 22, "height_cm": 180, "mass_kg": 75, "sport": "Basketball"},
        {"id": "S002", "age": 28, "height_cm": 165, "mass_kg": 60, "sport": "Soccer"},
        {"id": "S003", "age": 35, "height_cm": 175, "mass_kg": 82, "sport": "Weightlifting"},
        {"id": "S004", "age": 19, "height_cm": 190, "mass_kg": 88, "sport": "Track"},
    ]
    return jsonify(mock_subjects)


@app.route("/api/presets")
def presets():
    """Constraint presets."""
    return jsonify([
        {"name": "Deep Squat",   "activation": "high",   "depth": 120, "com_velocity": "Controlled", "pelvis_tilt": "Anterior"},
        {"name": "Rehab Motion", "activation": "low",    "depth": 60,  "com_velocity": "Low",        "pelvis_tilt": "Neutral"},
        {"name": "Explosive",    "activation": "high",   "depth": 90,  "com_velocity": "High",       "pelvis_tilt": "Neutral"},
        {"name": "Gait Analysis","activation": "medium", "depth": 75,  "com_velocity": "Controlled", "pelvis_tilt": "Posterior"},
        {"name": "Low Impact",   "activation": "low",    "depth": 55,  "com_velocity": "Low",        "pelvis_tilt": "Neutral"},
    ])


if __name__ == "__main__":
    app.run(debug=True, port=5000)
