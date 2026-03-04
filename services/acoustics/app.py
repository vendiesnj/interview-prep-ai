from __future__ import annotations

import os
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import numpy as np
import librosa

app = FastAPI(title="IPC Acoustic Analysis Service", version="0.1.0")

# In dev you can keep this open; in prod you should restrict allowed origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _downsample(arr, n: int = 120) -> np.ndarray:
    arr = np.asarray(arr, dtype=float)
    if arr.size <= n:
        return arr
    idx = np.linspace(0, arr.size - 1, n).astype(int)
    return arr[idx]


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze")
async def analyze(audio: UploadFile = File(...)):
    """
    Accepts multipart/form-data with field name 'audio'.
    Returns acoustic metrics computed from waveform.
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    raw = await audio.read()
    if not raw or len(raw) < 16:
        raise HTTPException(status_code=400, detail="Empty/invalid audio file")

    # Preserve extension if possible (helps ffmpeg), default to .webm
    suffix = ".webm"
    if "." in audio.filename:
        ext = "." + audio.filename.split(".")[-1].lower()
        if ext in [".webm", ".wav", ".mp3", ".m4a", ".ogg"]:
            suffix = ext

    tmp_path = None

    # Decode via temp file so librosa can fall back to audioread/ffmpeg for .webm
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(raw)
            tmp_path = tmp.name

        y, sr = librosa.load(tmp_path, sr=None, mono=True)

        if y is None or sr is None or len(y) < int(sr * 0.25):  # < 250ms
            raise ValueError("Audio too short or failed to decode")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to decode audio. Error: {type(e).__name__}: {e}",
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

    # ----------------------------
    # ENERGY (RMS) metrics
    # ----------------------------
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    energy_mean = float(np.mean(rms))
    energy_std = float(np.std(rms))

    # Energy variation score (0-10)
    if energy_mean <= 1e-8:
        energy_variation = 0.0
    else:
        cv = float(energy_std / energy_mean)  # coefficient of variation
        energy_variation = float(round(min(max((cv - 0.15) / 1.35, 0.0), 1.0) * 10.0, 2))

    # ----------------------------
# PITCH metrics (fundamental frequency)
# ----------------------------
try:
    f0, voiced_flag, voiced_prob = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
        frame_length=2048,
        hop_length=512,
    )
    if f0 is None:
        f0 = np.array([], dtype=float)
except Exception:
    f0 = np.array([], dtype=float)

# Convert NaNs -> 0 for the series, but keep voiced-only for stats
if f0.size > 0:
    voiced_f0 = f0[~np.isnan(f0)]
else:
    voiced_f0 = np.array([], dtype=float)

if voiced_f0.size == 0:
    pitch_mean = 0.0
    pitch_std = 0.0
    pitch_range = 0.0
else:
    pitch_mean = float(np.mean(voiced_f0))
    pitch_std = float(np.std(voiced_f0))
    pitch_range = float(np.max(voiced_f0) - np.min(voiced_f0))

# ----------------------------
# MONOTONE score (0-10)
# ----------------------------
if voiced_f0.size == 0:
    monotone_score = 10.0
else:
    std_norm = min(max((pitch_std - 5.0) / 15.0, 0.0), 1.0)
    range_norm = min(max((pitch_range - 30.0) / 120.0, 0.0), 1.0)
    expressiveness = 0.6 * std_norm + 0.4 * range_norm
    monotone_score = float(round((1.0 - expressiveness) * 10.0, 2))

# ----------------------------
# TEMPO + dynamics
# ----------------------------
try:
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo_arr = librosa.beat.tempo(onset_envelope=onset_env, sr=sr)
    tempo = float(tempo_arr[0]) if tempo_arr is not None and len(tempo_arr) else 0.0
except Exception:
    onset_env = None
    tempo = 0.0

try:
    if onset_env is None:
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)

    m = float(np.mean(onset_env)) if onset_env is not None and len(onset_env) else 0.0
    if m <= 1e-8:
        tempo_dynamics = 0.0
    else:
        onset_cv = float(np.std(onset_env) / m)
        tempo_dynamics = float(round(min(max((onset_cv - 0.25) / 1.25, 0.0), 1.0) * 10.0, 2))
except Exception:
    tempo_dynamics = 0.0

# ----------------------------
# SERIES (downsampled for UI) - ALWAYS RETURN
# ----------------------------
# Energy series from RMS (always exists)
energy_series = rms

# Pitch series: NaNs -> 0.0 so the UI can draw a line (unvoiced = 0)
pitch_series = np.nan_to_num(f0, nan=0.0) if f0.size > 0 else np.zeros_like(energy_series)

# Align pitch series length to energy series length (important!)
if pitch_series.shape[0] != energy_series.shape[0]:
    # simple resize via interpolation to match energy frames
    x_old = np.linspace(0.0, 1.0, num=pitch_series.shape[0]) if pitch_series.shape[0] > 1 else np.array([0.0])
    x_new = np.linspace(0.0, 1.0, num=energy_series.shape[0])
    pitch_series = np.interp(x_new, x_old, pitch_series).astype(float)

frames = np.arange(len(energy_series))
t_series = librosa.frames_to_time(frames, sr=sr, hop_length=512)

N = 120
t_ds = _downsample(t_series, N)
energy_ds = _downsample(energy_series, N)
pitch_ds = _downsample(pitch_series, N)

series = {
    "t": [float(round(x, 3)) for x in t_ds],
    "energy": [float(round(x, 6)) for x in energy_ds],
    "pitch": [float(round(x, 2)) for x in pitch_ds],
}

    return {
        "pitchMean": pitch_mean,
        "pitchStd": pitch_std,
        "pitchRange": pitch_range,
        "monotoneScore": monotone_score,
        "energyMean": energy_mean,
        "energyStd": energy_std,
        "energyVariation": energy_variation,
        "tempo": tempo,
        "tempoDynamics": tempo_dynamics,
        "sampleRate": int(sr),
        "durationSec": float(len(y) / sr),
        "series": series,
    }