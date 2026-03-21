"use client";

import { useRef, useCallback, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface FaceMetrics {
  eyeContact: number;      // 0–1: fraction of frames with gaze toward camera
  expressiveness: number;  // 0–1: facial landmark movement variance (normalized)
  headStability: number;   // 0–1: low head-pose variance = high stability
  framesAnalyzed: number;
  durationSeconds: number;
}

interface FrameSample {
  gazeScore: number;       // 0–1
  expressScore: number;    // landmark variance proxy
  headScore: number;       // head stability proxy
}

// ── MediaPipe lazy loader ────────────────────────────────────────────────────

let faceLandmarkerPromise: Promise<any> | null = null;

async function getFaceLandmarker() {
  if (faceLandmarkerPromise) return faceLandmarkerPromise;

  faceLandmarkerPromise = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1,
    });
  })();

  return faceLandmarkerPromise;
}

// ── Metric helpers ────────────────────────────────────────────────────────────

/**
 * Estimate eye contact from iris landmarks relative to eye corners.
 * Landmarks 468-472 = left iris, 473-477 = right iris (MediaPipe)
 * We approximate gaze by checking how centered the iris is within the eye.
 */
function estimateGazeScore(landmarks: any[]): number {
  try {
    // Left eye corners: 33 (outer), 133 (inner) — iris center: 468
    // Right eye corners: 362 (inner), 263 (outer) — iris center: 473
    const leftInner = landmarks[133];
    const leftOuter = landmarks[33];
    const leftIris = landmarks[468];

    const rightInner = landmarks[362];
    const rightOuter = landmarks[263];
    const rightIris = landmarks[473];

    if (!leftInner || !leftOuter || !leftIris || !rightInner || !rightOuter || !rightIris) return 0.5;

    // Fraction across the eye (0=outer, 1=inner). Centered = ~0.5
    const leftPos = (leftIris.x - leftOuter.x) / (leftInner.x - leftOuter.x);
    const rightPos = (rightIris.x - rightOuter.x) / (rightInner.x - rightOuter.x);

    const leftScore = 1 - Math.abs(leftPos - 0.5) * 2;
    const rightScore = 1 - Math.abs(rightPos - 0.5) * 2;

    return Math.max(0, Math.min(1, (leftScore + rightScore) / 2));
  } catch {
    return 0.5;
  }
}

/**
 * Expressiveness: variance of key facial landmark distances over time.
 * Computed per frame as distance between lips, eyebrows, etc.
 * Returns a normalized score (higher = more expressive).
 */
function measureExpressiveness(landmarks: any[]): number {
  try {
    // Lip open distance (13=upper lip, 14=lower lip)
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const mouthOpen = upperLip && lowerLip
      ? Math.abs(lowerLip.y - upperLip.y)
      : 0;

    // Brow raise (105=left brow, 334=right brow, 9=nose bridge)
    const leftBrow = landmarks[105];
    const rightBrow = landmarks[334];
    const noseBridge = landmarks[9];
    const browRaise = (leftBrow && noseBridge)
      ? Math.max(0, noseBridge.y - leftBrow.y)
      : 0;

    // Cheek raise (116=left cheek, 345=right cheek vs eye level 159=left eye)
    const leftEye = landmarks[159];
    const leftCheek = landmarks[116];
    const cheekRaise = (leftEye && leftCheek)
      ? Math.max(0, leftCheek.y - leftEye.y)
      : 0;

    // Combine and normalize to 0–1 (tuned empirically)
    const raw = mouthOpen * 8 + browRaise * 6 + cheekRaise * 4;
    return Math.max(0, Math.min(1, raw));
  } catch {
    return 0.5;
  }
}

/**
 * Head stability: nose tip (landmark 4) relative position.
 * Returns a value per frame; caller computes variance over session.
 */
function getNoseTip(landmarks: any[]): { x: number; y: number } {
  const nose = landmarks[4];
  return nose ? { x: nose.x, y: nose.y } : { x: 0.5, y: 0.5 };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFaceAnalysis() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<FrameSample[]>([]);
  const noseTipsRef = useRef<{ x: number; y: number }[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const landmarkerRef = useRef<any>(null);
  const isRunningRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  // Preload MediaPipe in the background as soon as the hook mounts
  useEffect(() => {
    getFaceLandmarker().then((lm) => { landmarkerRef.current = lm; }).catch(() => {});
    return () => {
      stopAnalysis();
    };
  }, []);

  const startAnalysis = useCallback(async (videoEl: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 10 },
      });
      streamRef.current = stream;
      videoEl.srcObject = stream;
      videoRef.current = videoEl;

      await new Promise<void>((res) => {
        videoEl.onloadedmetadata = () => { videoEl.play(); res(); };
      });

      // Ensure landmarker is ready
      if (!landmarkerRef.current) {
        landmarkerRef.current = await getFaceLandmarker();
      }

      samplesRef.current = [];
      noseTipsRef.current = [];
      isRunningRef.current = true;
      startTimeRef.current = Date.now();

      analyzeLoop();
    } catch (err) {
      console.warn("[FaceAnalysis] Could not start:", err);
    }
  }, []);

  function analyzeLoop() {
    if (!isRunningRef.current) return;
    const video = videoRef.current;
    const lm = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(analyzeLoop);
      return;
    }

    try {
      const result = lm.detectForVideo(video, Date.now());
      if (result?.faceLandmarks?.length > 0) {
        const landmarks = result.faceLandmarks[0];
        samplesRef.current.push({
          gazeScore: estimateGazeScore(landmarks),
          expressScore: measureExpressiveness(landmarks),
          headScore: 0, // filled from nose tips variance
        });
        noseTipsRef.current.push(getNoseTip(landmarks));
      }
    } catch {
      // frame skip — ok
    }

    animFrameRef.current = requestAnimationFrame(analyzeLoop);
  }

  const stopAnalysis = useCallback((): FaceMetrics | null => {
    isRunningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const samples = samplesRef.current;
    const noseTips = noseTipsRef.current;

    if (samples.length < 5) return null;

    // Eye contact: average gaze score
    const eyeContact = samples.reduce((a, s) => a + s.gazeScore, 0) / samples.length;

    // Expressiveness: average per-frame expressiveness (relative to baseline 0.5)
    const rawExpress = samples.reduce((a, s) => a + s.expressScore, 0) / samples.length;
    const expressiveness = Math.max(0, Math.min(1, rawExpress));

    // Head stability: 1 - normalized variance of nose tip position
    let headStability = 1;
    if (noseTips.length > 2) {
      const meanX = noseTips.reduce((a, p) => a + p.x, 0) / noseTips.length;
      const meanY = noseTips.reduce((a, p) => a + p.y, 0) / noseTips.length;
      const variance = noseTips.reduce((a, p) => a + Math.pow(p.x - meanX, 2) + Math.pow(p.y - meanY, 2), 0) / noseTips.length;
      // Normalize: typical variance < 0.001 = stable, > 0.01 = unstable
      headStability = Math.max(0, Math.min(1, 1 - variance * 100));
    }

    const durationSeconds = (Date.now() - startTimeRef.current) / 1000;

    return {
      eyeContact: Math.round(eyeContact * 100) / 100,
      expressiveness: Math.round(expressiveness * 100) / 100,
      headStability: Math.round(headStability * 100) / 100,
      framesAnalyzed: samples.length,
      durationSeconds: Math.round(durationSeconds),
    };
  }, []);

  return { startAnalysis, stopAnalysis, videoRef };
}
