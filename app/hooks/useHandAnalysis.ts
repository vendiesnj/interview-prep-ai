"use client";

import { useRef, useCallback, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HandMetrics {
  // Presence
  handVisibilityRate: number;      // 0-1: fraction of frames with ≥1 hand visible
  twoHandRate: number;             // 0-1: fraction of frames with both hands visible

  // Self-touch (nervous signals — lower is better)
  faceTouchCount: number;          // # of distinct face-touch events
  neckTouchCount: number;          // # of distinct neck/chest-touch events

  // Gesture quality
  openGestureRate: number;         // 0-1: fraction of frames with open/expressive gesture (good)
  pointingRate: number;            // 0-1: fraction with pointing gesture (neutral/persuasive)
  fistRate: number;                // 0-1: fraction with closed fist (can signal tension)
  gestureSpan: number;             // 0-1: avg normalized horizontal span of gestures
  gestureEnergy: number;           // 0-1: movement velocity score (0 = frozen, 1 = very animated)

  // Hand position zone (where are hands in frame)
  chestZoneRate: number;           // 0-1: fraction of frames hands at chest/waist level (ideal speaking zone)
  lowZoneRate: number;             // 0-1: fraction of frames hands below waist (hidden/inactive)
  highZoneRate: number;            // 0-1: fraction of frames hands above shoulders

  // Composite scores (0-100)
  gestureScore: number;            // composite: expressive gestures, span, visibility
  fidgetScore: number;             // composite: face touch, neck touch, fist rate, erratic movement

  framesAnalyzed: number;
  durationSeconds: number;
}

// HandLandmark indices
const TIP_INDICES   = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky tips
const PIP_INDICES   = [3, 6, 10, 14, 18]; // pip joints matching tips
const MCP_INDICES   = [2, 5, 9, 13, 17];  // mcp joints
const WRIST_IDX     = 0;

type FrameSample = {
  visible: boolean;
  twoHands: boolean;
  faceTouch: boolean;
  neckTouch: boolean;
  gestureType: "open" | "fist" | "pointing" | "other";
  span: number;          // horizontal span 0-1
  wristY: number;        // normalized y (0=top, 1=bottom)
  wristX: number;
  velocityMag: number;   // movement magnitude from previous frame
};

// ── Lazy loader ───────────────────────────────────────────────────────────────

let handLandmarkerPromise: Promise<any> | null = null;

async function getHandLandmarker() {
  if (handLandmarkerPromise) return handLandmarkerPromise;

  handLandmarkerPromise = (async () => {
    const vision = await import("@mediapipe/tasks-vision") as any;
    const { HandLandmarker, FilesetResolver } = vision;

    const filesetVision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    return HandLandmarker.createFromOptions(filesetVision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
    });
  })();

  return handLandmarkerPromise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Count extended fingers (0-5).
 * Thumb: tip.x further from wrist than mcp.x (flipped for right/left).
 * Others: tip.y above pip.y (higher in image = lower y value).
 */
function countExtendedFingers(landmarks: any[]): number {
  let count = 0;

  // Thumb: compare tip x to MCP x relative to wrist
  const wrist = landmarks[WRIST_IDX];
  const thumbMcp = landmarks[2];
  const thumbTip = landmarks[4];
  if (wrist && thumbMcp && thumbTip) {
    const side = wrist.x < 0.5 ? 1 : -1; // rough left/right hand
    if ((thumbTip.x - thumbMcp.x) * side > 0.02) count++;
  }

  // Fingers: tip y above pip y (in image coords, lower y = higher up)
  const fingerPairs: [number, number][] = [[8, 6], [12, 10], [16, 14], [20, 18]];
  for (const [tip, pip] of fingerPairs) {
    const tipLm  = landmarks[tip];
    const pipLm  = landmarks[pip];
    if (tipLm && pipLm && tipLm.y < pipLm.y - 0.02) count++;
  }

  return count;
}

/**
 * Classify gesture from one hand's landmarks.
 */
function classifyGesture(landmarks: any[]): "open" | "fist" | "pointing" | "other" {
  const extended = countExtendedFingers(landmarks);
  if (extended >= 4) return "open";
  if (extended === 0) return "fist";
  // Pointing: index up, others down
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  if (indexTip && indexPip && indexTip.y < indexPip.y - 0.02
    && middleTip && middlePip && middleTip.y > middlePip.y - 0.01) {
    return "pointing";
  }
  return "other";
}

/**
 * Compute bounding box width (span) across all visible hand landmarks.
 */
function computeSpan(allLandmarks: any[][]): number {
  const allX = allLandmarks.flat().map((l: any) => l.x).filter(Boolean);
  if (allX.length < 2) return 0;
  return Math.max(...allX) - Math.min(...allX);
}

/**
 * Estimate wrist position from first visible hand.
 */
function getWrist(hand: any[]): { x: number; y: number } {
  const w = hand[WRIST_IDX];
  return w ? { x: w.x, y: w.y } : { x: 0.5, y: 0.5 };
}

/**
 * Face-touch: any fingertip in the face region.
 * Face typically occupies top ~40% of frame, center ~60% horizontally.
 */
function detectFaceTouch(hands: any[][]): boolean {
  return hands.some(hand =>
    TIP_INDICES.some(i => {
      const lm = hand[i];
      return lm && lm.y < 0.42 && lm.x > 0.18 && lm.x < 0.82;
    })
  );
}

/**
 * Neck/chest touch: wrist or palm in the neck-chest zone.
 */
function detectNeckTouch(hands: any[][]): boolean {
  return hands.some(hand => {
    const wrist = hand[WRIST_IDX];
    const palm  = hand[9]; // middle finger MCP ≈ palm center
    return (wrist && wrist.y > 0.40 && wrist.y < 0.65 && wrist.x > 0.28 && wrist.x < 0.72)
        || (palm  && palm.y  > 0.40 && palm.y  < 0.65 && palm.x  > 0.28 && palm.x  < 0.72);
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHandAnalysis() {
  const videoRef     = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<any>(null);
  const samplesRef   = useRef<FrameSample[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  // For velocity: track previous wrist position
  const prevWristRef = useRef<{ x: number; y: number } | null>(null);
  // For event de-duplication: don't count a touch that persists for >2 frames as multiple events
  const prevFaceTouchRef = useRef(false);
  const prevNeckTouchRef = useRef(false);
  const faceTouchCountRef = useRef(0);
  const neckTouchCountRef = useRef(0);

  useEffect(() => {
    getHandLandmarker().then(lm => { landmarkerRef.current = lm; }).catch(() => {});
    return () => {
      isRunningRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const startAnalysis = useCallback((videoEl: HTMLVideoElement) => {
    videoRef.current = videoEl;
    samplesRef.current = [];
    prevWristRef.current = null;
    prevFaceTouchRef.current = false;
    prevNeckTouchRef.current = false;
    faceTouchCountRef.current = 0;
    neckTouchCountRef.current = 0;
    isRunningRef.current = true;
    startTimeRef.current = Date.now();
    analyzeLoop();
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
      const hands: any[][] = result?.landmarks ?? [];
      const visible = hands.length > 0;

      if (visible) {
        const isFaceTouch = detectFaceTouch(hands);
        const isNeckTouch = detectNeckTouch(hands);

        // Count rising edges (new touch events)
        if (isFaceTouch && !prevFaceTouchRef.current) faceTouchCountRef.current++;
        if (isNeckTouch && !prevNeckTouchRef.current) neckTouchCountRef.current++;
        prevFaceTouchRef.current = isFaceTouch;
        prevNeckTouchRef.current = isNeckTouch;

        // Gesture: use dominant hand (first detected)
        const dominantHand = hands[0];
        const gestureType  = classifyGesture(dominantHand);
        const span         = computeSpan(hands);
        const wrist        = getWrist(dominantHand);

        // Velocity
        let velocityMag = 0;
        if (prevWristRef.current) {
          const dx = wrist.x - prevWristRef.current.x;
          const dy = wrist.y - prevWristRef.current.y;
          velocityMag = Math.sqrt(dx * dx + dy * dy);
        }
        prevWristRef.current = wrist;

        samplesRef.current.push({
          visible: true,
          twoHands: hands.length >= 2,
          faceTouch: isFaceTouch,
          neckTouch: isNeckTouch,
          gestureType,
          span: Math.min(1, span),
          wristY: wrist.y,
          wristX: wrist.x,
          velocityMag: Math.min(1, velocityMag * 30), // normalize to 0-1
        });
      } else {
        prevWristRef.current = null;
        prevFaceTouchRef.current = false;
        prevNeckTouchRef.current = false;
        samplesRef.current.push({
          visible: false, twoHands: false, faceTouch: false, neckTouch: false,
          gestureType: "other", span: 0, wristY: 0.5, wristX: 0.5, velocityMag: 0,
        });
      }
    } catch {
      // frame skip
    }

    animFrameRef.current = requestAnimationFrame(analyzeLoop);
  }

  const stopAnalysis = useCallback((): HandMetrics | null => {
    isRunningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const samples = samplesRef.current;
    const n = samples.length;
    if (n < 5) return null;

    const durationSeconds = (Date.now() - startTimeRef.current) / 1000;
    const visibleSamples  = samples.filter(s => s.visible);
    const nv = visibleSamples.length;

    const handVisibilityRate = n > 0 ? nv / n : 0;
    const twoHandRate        = nv > 0 ? visibleSamples.filter(s => s.twoHands).length / n : 0;

    const faceTouchCount = faceTouchCountRef.current;
    const neckTouchCount = neckTouchCountRef.current;

    const openGestureRate = nv > 0 ? visibleSamples.filter(s => s.gestureType === "open").length / nv : 0;
    const pointingRate    = nv > 0 ? visibleSamples.filter(s => s.gestureType === "pointing").length / nv : 0;
    const fistRate        = nv > 0 ? visibleSamples.filter(s => s.gestureType === "fist").length / nv : 0;

    const gestureSpan = nv > 0
      ? visibleSamples.reduce((a, s) => a + s.span, 0) / nv
      : 0;

    const gestureEnergy = nv > 0
      ? visibleSamples.reduce((a, s) => a + s.velocityMag, 0) / nv
      : 0;

    // Zone detection: y < 0.35 = high (above shoulders), y > 0.65 = low (below waist), else chest
    const chestZoneRate = nv > 0 ? visibleSamples.filter(s => s.wristY >= 0.35 && s.wristY <= 0.65).length / n : 0;
    const lowZoneRate   = nv > 0 ? visibleSamples.filter(s => s.wristY > 0.65).length / n : 0;
    const highZoneRate  = nv > 0 ? visibleSamples.filter(s => s.wristY < 0.35).length / n : 0;

    // Gesture score: rewards open gestures, span, visibility, chest zone, mild energy
    const gestureScore = Math.round(Math.min(100, (
      openGestureRate * 40 +
      Math.min(gestureSpan / 0.4, 1) * 20 +
      handVisibilityRate * 20 +
      chestZoneRate * 10 +
      Math.min(gestureEnergy / 0.15, 1) * 10
    )));

    // Fidget score: penalizes face/neck touch, fist, excessive small rapid movement, hidden hands
    const selfTouchPenalty = Math.min(1, (faceTouchCount + neckTouchCount * 0.5) / 5);
    const erraticMovement  = gestureEnergy > 0.25 ? Math.min(1, (gestureEnergy - 0.25) / 0.25) : 0;
    const fidgetScore = Math.round(Math.min(100, (
      selfTouchPenalty * 50 +
      fistRate * 20 +
      erraticMovement * 20 +
      lowZoneRate * 10
    )));

    return {
      handVisibilityRate: Math.round(handVisibilityRate * 100) / 100,
      twoHandRate:        Math.round(twoHandRate        * 100) / 100,
      faceTouchCount,
      neckTouchCount,
      openGestureRate:    Math.round(openGestureRate    * 100) / 100,
      pointingRate:       Math.round(pointingRate       * 100) / 100,
      fistRate:           Math.round(fistRate           * 100) / 100,
      gestureSpan:        Math.round(gestureSpan        * 100) / 100,
      gestureEnergy:      Math.round(gestureEnergy      * 100) / 100,
      chestZoneRate:      Math.round(chestZoneRate      * 100) / 100,
      lowZoneRate:        Math.round(lowZoneRate        * 100) / 100,
      highZoneRate:       Math.round(highZoneRate       * 100) / 100,
      gestureScore,
      fidgetScore,
      framesAnalyzed: n,
      durationSeconds: Math.round(durationSeconds),
    };
  }, []);

  return { startAnalysis, stopAnalysis };
}
