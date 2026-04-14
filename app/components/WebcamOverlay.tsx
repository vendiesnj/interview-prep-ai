"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useFaceAnalysis, type FaceMetrics } from "@/app/hooks/useFaceAnalysis";

export interface WebcamOverlayHandle {
  start: () => Promise<void>;
  stop: () => FaceMetrics | null;
}

interface Props {
  isRecording: boolean;
  onMetrics?: (metrics: FaceMetrics) => void;
  /** position relative to its parent container */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

const POSITION_STYLES: Record<NonNullable<Props["position"]>, React.CSSProperties> = {
  "bottom-right": { bottom: 16, right: 16 },
  "bottom-left":  { bottom: 16, left: 16 },
  "top-right":    { top: 16, right: 16 },
  "top-left":     { top: 16, left: 16 },
};

const WebcamOverlay = forwardRef<WebcamOverlayHandle, Props>(
  ({ isRecording, onMetrics, position = "bottom-right" }, ref) => {
    const videoElRef = useRef<HTMLVideoElement>(null);
    const { startAnalysis, stopAnalysis } = useFaceAnalysis();
    const [status, setStatus] = useState<"idle" | "loading" | "active" | "denied" | "unsupported">("idle");
    const [liveMetric, setLiveMetric] = useState<{ eyeContact: number } | null>(null);
    const metricIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useImperativeHandle(ref, () => ({
      start: async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus("unsupported");
          return;
        }
        setStatus("loading");
        try {
          await startAnalysis(videoElRef.current!);
          setStatus("active");
        } catch {
          setStatus("denied");
        }
      },
      stop: () => {
        const metrics = stopAnalysis();
        setStatus("idle");
        if (metricIntervalRef.current) clearInterval(metricIntervalRef.current);
        if (metrics && onMetrics) onMetrics(metrics);
        return metrics;
      },
    }));

    // Kick off / tear down when isRecording changes
    useEffect(() => {
      if (isRecording) {
        if (!navigator.mediaDevices?.getUserMedia) { setStatus("unsupported"); return; }
        setStatus("loading");
        startAnalysis(videoElRef.current!).then(() => {
          setStatus("active");
        }).catch(() => setStatus("denied"));
      } else if (status === "active") {
        const metrics = stopAnalysis();
        setStatus("idle");
        if (metricIntervalRef.current) clearInterval(metricIntervalRef.current);
        if (metrics && onMetrics) onMetrics(metrics);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecording]);

    // Force stop stream when component unmounts (e.g., user navigates away mid-recording)
    useEffect(() => {
      return () => {
        stopAnalysis();
        if (metricIntervalRef.current) clearInterval(metricIntervalRef.current);
        setStatus("idle");
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (status === "idle" || status === "unsupported") return null;

    return (
      <div
        style={{
          position: "absolute",
          ...POSITION_STYLES[position],
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
          pointerEvents: "none",
        }}
      >
        {/* Webcam preview */}
        <div style={{
          width: 100, height: 75, borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          border: status === "active" ? "2px solid rgba(16,185,129,0.7)" : "2px solid rgba(255,255,255,0.15)",
          background: "#000",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          position: "relative",
        }}>
          <video
            ref={videoElRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
          />
          {status === "loading" && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.6)", fontSize: 10, color: "#fff", fontWeight: 700,
            }}>
              Loading...
            </div>
          )}
          {status === "denied" && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.7)", fontSize: 10, color: "#EF4444", fontWeight: 700, textAlign: "center", padding: 4,
            }}>
              Camera denied
            </div>
          )}
        </div>

        {/* Live indicator */}
        {status === "active" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
            borderRadius: 99, padding: "3px 10px",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: "#10B981",
              animation: "pulse 1.5s infinite",
            }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: 0.5 }}>ANALYZING</span>
          </div>
        )}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );
  }
);

WebcamOverlay.displayName = "WebcamOverlay";
export default WebcamOverlay;
