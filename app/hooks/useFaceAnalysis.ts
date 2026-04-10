"use client";

import { useRef, useCallback, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface FaceMetrics {
  eyeContact: number;       // 0–1: fraction of frames gazing toward camera
  expressiveness: number;   // 0–1: facial landmark movement variance
  headStability: number;    // 0–1: low nose-tip variance = high stability
  smileRate: number;        // 0–1: fraction of frames with a detectable smile
  blinkRate: number;        // blinks per minute (ideal 12–20; >30 = nervous)
  browEngagement: number;   // 0–1: brow movement activity (0 = frozen face)
  lookAwayRate: number;     // 0–1: fraction of frames looking away from camera
  framesAnalyzed: number;
  durationSeconds: number;
}

interface FrameSample {
  gazeScore: number;
  expressScore: number;
  smileScore: number;
  browScore: number;
  lookAway: boolean;
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

// ── Blendshape helper ─────────────────────────────────────────────────────────

function readBlendshapes(result: any): Record<string, number> {
  try {
    const cats = result?.faceBlendshapes?.[0]?.categories;
    if (!cats) return {};
    const map: Record<string, number> = {};
    for (const c of cats) map[c.categoryName] = c.score;
    return map;
  } catch {
    return {};
  }
}

// ── Landmark-based helpers ────────────────────────────────────────────────────

/**
 * Eye contact: iris centers (468, 473) centered within eye corners.
 */
function estimateGazeScore(landmarks: any[]): number {
  try {
    const leftInner = landmarks[133];
    const leftOuter = landmarks[33];
    const leftIris  = landmarks[468];
    const rightInner = landmarks[362];
    const rightOuter = landmarks[263];
    const rightIris  = landmarks[473];

    if (!leftInner || !leftOuter || !leftIris || !rightInner || !rightOuter || !rightIris) return 0.5;

    const leftPos  = (leftIris.x  - leftOuter.x)  / (leftInner.x  - leftOuter.x);
    const rightPos = (rightIris.x - rightOuter.x) / (rightInner.x - rightOuter.x);

    const leftScore  = 1 - Math.abs(leftPos  - 0.5) * 2;
    const rightScore = 1 - Math.abs(rightPos - 0.5) * 2;

    return Math.max(0, Math.min(1, (leftScore + rightScore) / 2));
  } catch {
    return 0.5;
  }
}

/**
 * Expressiveness: mouth opening + brow raise + cheek raise distances.
 */
function measureExpressiveness(landmarks: any[]): number {
  try {
    const upperLip   = landmarks[13];
    const lowerLip   = landmarks[14];
    const mouthOpen  = upperLip && lowerLip ? Math.abs(lowerLip.y - upperLip.y) : 0;

    const leftBrow   = landmarks[105];
    const noseBridge = landmarks[9];
    const browRaise  = (leftBrow && noseBridge) ? Math.max(0, noseBridge.y - leftBrow.y) : 0;

    const leftEye   = landmarks[159];
    const leftCheek = landmarks[116];
    const cheekRaise = (leftEye && leftCheek) ? Math.max(0, leftCheek.y - leftEye.y) : 0;

    const raw = mouthOpen * 8 + browRaise * 6 + cheekRaise * 4;
    return Math.max(0, Math.min(1, raw));
  } catch {
    return 0.5;
  }
}

/**
 * Nose tip for head stability variance.
 */
function getNoseTip(landmarks: any[]): { x: number; y: number } {
  const nose = landmarks[4];
  return nose ? { x: nose.x, y: nose.y } : { x: 0.5, y: 0.5 };
}

// ── Blendshape-based metric extractors ───────────────────────────────────────

/**
 * Smile score: average of mouthSmileLeft and mouthSmileRight.
 * > 0.12 = detectable smile.
 */
function getSmileScore(bs: Record<string, number>): number {
  return ((bs.mouthSmileLeft ?? 0) + (bs.mouthSmileRight ?? 0)) / 2;
}

/**
 * Brow engagement: mean of all five brow action units.
 * Captures both raises and furrows — a frozen brow = 0.
 */
function getBrowEngagement(bs: Record<string, number>): number {
  const inner      = bs.browInnerUp      ?? 0;
  const outerLeft  = bs.browOuterUpLeft  ?? 0;
  const outerRight = bs.browOuterUpRight ?? 0;
  const downLeft   = bs.browDownLeft     ?? 0;
  const downRight  = bs.browDownRight    ?? 0;
  return (inner + outerLeft + outerRight + downLeft + downRight) / 5;
}

/**
 * Look-away: true when candidate is looking down (at notes) or strongly sideways.
 * eyeLookDown > 0.28 = head tilted down; eyeLookOut > 0.38 = side glance.
 */
function isLookingAway(bs: Record<string, number>): boolean {
  const downAvg = ((bs.eyeLookDownLeft ?? 0) + (bs.eyeLookDownRight ?? 0)) / 2;
  const outMax  = Math.max(bs.eyeLookOutLeft ?? 0, bs.eyeLookOutRight ?? 0);
  return downAvg > 0.28 || outMax > 0.38;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFaceAnalysis() {
  const videoRef      = useRef<HTMLVideoElement | null>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const samplesRef    = useRef<FrameSample[]>([]);
  const noseTipsRef   = useRef<{ x: number; y: number }[]>([]);
  const animFrameRef  = useRef<number | null>(null);
  const landmarkerRef = useRef<any>(null);
  const isRunningRef  = useRef(false);
  const startTimeRef  = useRef<number>(0);

  // Blink tracking (detect threshold crossings, not raw value)
  const prevBlinkLeftRef  = useRef<number>(0);
  const prevBlinkRightRef = useRef<number>(0);
  const blinkCountRef     = useRef<number>(0);

  useEffect(() => {
    getFaceLandmarker().then((lm) => { landmarkerRef.current = lm; }).catch(() => {});
    return () => {
      isRunningRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
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

      if (!landmarkerRef.current) {
        landmarkerRef.current = await getFaceLandmarker();
      }

      samplesRef.current      = [];
      noseTipsRef.current     = [];
      blinkCountRef.current   = 0;
      prevBlinkLeftRef.current  = 0;
      prevBlinkRightRef.current = 0;
      isRunningRef.current    = true;
      startTimeRef.current    = Date.now();

      analyzeLoop();
    } catch (err) {
      console.warn("[FaceAnalysis] Could not start:", err);
    }
  }, []);

  function analyzeLoop() {
    if (!isRunningRef.current) return;
    const video = videoRef.current;
    const lm    = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(analyzeLoop);
      return;
    }

    try {
      const result = lm.detectForVideo(video, Date.now());
      if (result?.faceLandmarks?.length > 0) {
        const landmarks = result.faceLandmarks[0];
        const bs        = readBlendshapes(result);

        // Blink detection: count transitions from open (< 0.45) to closed (> 0.65)
        const blinkL = bs.eyeBlinkLeft  ?? 0;
        const blinkR = bs.eyeBlinkRight ?? 0;
        if (prevBlinkLeftRef.current  < 0.45 && blinkL  > 0.65) blinkCountRef.current++;
        if (prevBlinkRightRef.current < 0.45 && blinkR > 0.65) blinkCountRef.current++;
        prevBlinkLeftRef.current  = blinkL;
        prevBlinkRightRef.current = blinkR;

        samplesRef.current.push({
          gazeScore:   estimateGazeScore(landmarks),
          expressScore: measureExpressiveness(landmarks),
          smileScore:  getSmileScore(bs),
          browScore:   getBrowEngagement(bs),
          lookAway:    isLookingAway(bs),
        });
        noseTipsRef.current.push(getNoseTip(landmarks));
      }
    } catch {
      // frame skip - ok
    }

    animFrameRef.current = requestAnimationFrame(analyzeLoop);
  }

  const stopAnalysis = useCallback((): FaceMetrics | null => {
    isRunningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const samples   = samplesRef.current;
    const noseTips  = noseTipsRef.current;
    const n         = samples.length;

    if (n < 5) return null;

    const durationSeconds = (Date.now() - startTimeRef.current) / 1000;

    // Eye contact: mean gaze score
    const eyeContact = samples.reduce((a, s) => a + s.gazeScore, 0) / n;

    // Expressiveness: mean landmark-based expressiveness
    const expressiveness = Math.max(0, Math.min(1,
      samples.reduce((a, s) => a + s.expressScore, 0) / n
    ));

    // Head stability: 1 - normalized nose-tip variance
    let headStability = 1;
    if (noseTips.length > 2) {
      const meanX = noseTips.reduce((a, p) => a + p.x, 0) / noseTips.length;
      const meanY = noseTips.reduce((a, p) => a + p.y, 0) / noseTips.length;
      const variance = noseTips.reduce((a, p) => a + (p.x - meanX) ** 2 + (p.y - meanY) ** 2, 0) / noseTips.length;
      headStability = Math.max(0, Math.min(1, 1 - variance * 100));
    }

    // Smile rate: fraction of frames where smile score > 0.12
    const smileRate = samples.filter(s => s.smileScore > 0.12).length / n;

    // Blink rate: blinks per minute (divide raw count by 2 since we count each eye)
    const blinkRate = durationSeconds > 0
      ? Math.round((blinkCountRef.current / 2) / (durationSeconds / 60))
      : 0;

    // Brow engagement: mean brow action unit score
    const browEngagement = Math.max(0, Math.min(1,
      samples.reduce((a, s) => a + s.browScore, 0) / n
    ));

    // Look-away rate: fraction of frames where gaze was off-camera
    const lookAwayRate = samples.filter(s => s.lookAway).length / n;

    return {
      eyeContact:     Math.round(eyeContact    * 100) / 100,
      expressiveness: Math.round(expressiveness * 100) / 100,
      headStability:  Math.round(headStability  * 100) / 100,
      smileRate:      Math.round(smileRate      * 100) / 100,
      blinkRate:      Math.max(0, blinkRate),
      browEngagement: Math.round(browEngagement * 100) / 100,
      lookAwayRate:   Math.round(lookAwayRate   * 100) / 100,
      framesAnalyzed: n,
      durationSeconds: Math.round(durationSeconds),
    };
  }, []);

  return { startAnalysis, stopAnalysis, videoRef };
}
