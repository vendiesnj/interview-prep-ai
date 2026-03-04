from __future__ import annotations

import io
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="IPC Acoustic Analysis Service", version="0.1.0")

# In dev you can keep this open; in prod you should restrict allowed origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

    # Decode using librosa (ffmpeg handles webm/opus)
    try:
        import librosa
        import numpy as np

        y, sr = librosa.load(io.BytesIO(raw), sr=None, mono=True)
        if y is None or len(y) < sr * 0.25:  # < 250ms
            raise ValueError("Audio too short")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to decode audio. Error: {type(e).__name__}: {e}",
        )

    # ----------------------------
    # ENERGY (RMS) metrics
    # ----------------------------
    # Frame-level RMS energy
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    energy_mean = float(np.mean(rms))
    energy_std = float(np.std(rms))

    # ----------------------------
    # PITCH metrics (fundamental frequency)
    # ----------------------------
    # librosa.pyin is robust for speech, returns f0 (Hz) + voiced flags
    f0, voiced_flag, voiced_prob = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),  # ~65 Hz (low male)
        fmax=librosa.note_to_hz("C7"),  # ~2093 Hz
        sr=sr,
        frame_length=2048,
        hop_length=512,
    )

    # Keep only voiced frames with non-null f0
    voiced_f0 = f0[~np.isnan(f0)]
    if voiced_f0.size == 0:
        pitch_mean = pitch_std = pitch_range = 0.0
    else:
        pitch_mean = float(np.mean(voiced_f0))
        pitch_std = float(np.std(voiced_f0))
        pitch_range = float(np.max(voiced_f0) - np.min(voiced_f0))

    # ----------------------------
    # TEMPO estimate
    # ----------------------------
    # For speech this is a rough proxy. We'll keep it as a single scalar.
    try:
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        tempo = float(librosa.beat.tempo(onset_envelope=onset_env, sr=sr)[0])
    except Exception:
        tempo = 0.0

    return {
        "pitchMean": pitch_mean,
        "pitchStd": pitch_std,
        "pitchRange": pitch_range,
        "energyMean": energy_mean,
        "energyStd": energy_std,
        "tempo": tempo,
        "sampleRate": int(sr),
        "durationSec": float(len(y) / sr),
    }