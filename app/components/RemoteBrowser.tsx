"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Monitor,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  AlertTriangle,
  X,
} from "lucide-react";

interface Props {
  sessionId: string;
  studentId: string;
  width?: number;
  height?: number;
  onClose?: () => void;
}

export default function RemoteBrowser({
  sessionId,
  studentId,
  width = 1280,
  height = 800,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<
    "connecting" | "connected" | "error" | "disconnected"
  >("connecting");
  const [currentUrl, setCurrentUrl] = useState("https://www.google.com");
  const [urlInputValue, setUrlInputValue] = useState(
    "https://www.google.com",
  );
  const [isEditing, setIsEditing] = useState(false);

  // Scale factor: canvas display size vs actual browser size
  const DISPLAY_WIDTH = 1100;
  const DISPLAY_HEIGHT = Math.round(height * (DISPLAY_WIDTH / width));
  const scaleX = width / DISPLAY_WIDTH;
  const scaleY = height / DISPLAY_HEIGHT;

  const drawFrame = useCallback(
    (base64: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
      img.src = `data:image/jpeg;base64,${base64}`;
    },
    [DISPLAY_WIDTH, DISPLAY_HEIGHT],
  );

  useEffect(() => {
    const browserServiceUrl = process.env.NEXT_PUBLIC_BROWSER_WS_URL;
    let wsUrl: string;
    if (browserServiceUrl) {
      // Production: Railway service URL (set in Vercel env vars)
      const base = browserServiceUrl.replace(/^http/, "ws").replace(/\/$/, "");
      wsUrl = `${base}?sessionId=${sessionId}&studentId=${studentId}`;
    } else {
      // Local dev: browser-server.ts runs on port 3001
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//localhost:3001?sessionId=${sessionId}&studentId=${studentId}`;
    }
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");
    ws.onerror = () => setStatus("error");
    ws.onclose = () => setStatus("disconnected");
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "frame") drawFrame(msg.data);
        if (msg.type === "urlChange") {
          setCurrentUrl(msg.url);
          setUrlInputValue(msg.url);
        }
        if (msg.type === "error") setStatus("error");
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
    };
  }, [sessionId, studentId, drawFrame]);

  function send(msg: object) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }

  function getScaledCoords(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y } = getScaledCoords(e);
    send({ type: "mouseMove", x, y });
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const { x, y } = getScaledCoords(e);
    const button =
      e.button === 2 ? "right" : e.button === 1 ? "middle" : "left";
    send({ type: "mouseDown", x, y, button });
  }

  function onMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const { x, y } = getScaledCoords(e);
    const button =
      e.button === 2 ? "right" : e.button === 1 ? "middle" : "left";
    send({ type: "mouseUp", x, y, button });
  }

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const { x, y } = getScaledCoords(
      e as unknown as React.MouseEvent<HTMLCanvasElement>,
    );
    send({ type: "scroll", x, y, deltaX: e.deltaX, deltaY: e.deltaY });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (isEditing) return;
    e.preventDefault();
    const modifiers =
      (e.shiftKey ? 8 : 0) |
      (e.ctrlKey ? 2 : 0) |
      (e.altKey ? 1 : 0) |
      (e.metaKey ? 4 : 0);
    send({
      type: "keyDown",
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      modifiers,
    });
    if (e.key.length === 1) {
      send({ type: "keyChar", key: e.key, code: e.code, keyCode: e.keyCode });
    }
  }

  function onKeyUp(e: React.KeyboardEvent) {
    if (isEditing) return;
    e.preventDefault();
    const modifiers =
      (e.shiftKey ? 8 : 0) |
      (e.ctrlKey ? 2 : 0) |
      (e.altKey ? 1 : 0) |
      (e.metaKey ? 4 : 0);
    send({
      type: "keyUp",
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      modifiers,
    });
  }

  function handleNavigate(e: React.FormEvent) {
    e.preventDefault();
    send({ type: "navigate", url: urlInputValue });
    setIsEditing(false);
    canvasRef.current?.focus();
  }

  const statusColors = {
    connecting: "#F59E0B",
    connected: "#10B981",
    error: "#EF4444",
    disconnected: "#6B7280",
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#1a1a2e",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        width: DISPLAY_WIDTH + 2,
      }}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      {/* Tracking Banner */}
      <div
        style={{
          background: "#7C3AED",
          padding: "6px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "center",
        }}
      >
        <AlertTriangle size={14} color="#fff" />
        <span
          style={{
            fontSize: 12,
            color: "#fff",
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          This session is being recorded and monitored by your institution
        </span>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: "#EF4444",
            animation: "pulse 1.5s infinite",
            marginLeft: 4,
          }}
        />
      </div>

      {/* Browser Toolbar */}
      <div
        style={{
          background: "#111827",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          onClick={() => send({ type: "back" })}
          style={{
            background: "none",
            border: "none",
            color: "#9CA3AF",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          onClick={() => send({ type: "forward" })}
          style={{
            background: "none",
            border: "none",
            color: "#9CA3AF",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => send({ type: "reload" })}
          style={{
            background: "none",
            border: "none",
            color: "#9CA3AF",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
          }}
        >
          <RotateCw size={16} />
        </button>

        {/* URL bar */}
        <form onSubmit={handleNavigate} style={{ flex: 1 }}>
          <input
            ref={urlInputRef}
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={() => {
              setIsEditing(false);
              setUrlInputValue(currentUrl);
            }}
            style={{
              width: "100%",
              padding: "6px 12px",
              borderRadius: 99,
              fontSize: 12,
              background: "#1F2937",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#E5E7EB",
              outline: "none",
              fontFamily: "monospace",
            }}
          />
        </form>

        {/* Status dot */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: statusColors[status],
            }}
          />
          <span
            style={{
              fontSize: 10,
              color: "#6B7280",
              textTransform: "capitalize",
            }}
          >
            {status}
          </span>
        </div>

        <Monitor size={16} color="#6B7280" />

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "4px 6px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Canvas — the actual browser view */}
      <div style={{ position: "relative", background: "#fff" }}>
        {status === "connecting" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#0f172a",
              zIndex: 10,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 99,
                border: "3px solid #7C3AED",
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ color: "#9CA3AF", fontSize: 13 }}>
              Starting secure browser session…
            </span>
          </div>
        )}
        {status === "error" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#0f172a",
              zIndex: 10,
              gap: 8,
            }}
          >
            <AlertTriangle size={32} color="#EF4444" />
            <span
              style={{ color: "#EF4444", fontSize: 13, fontWeight: 700 }}
            >
              Failed to connect to browser session
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={DISPLAY_WIDTH}
          height={DISPLAY_HEIGHT}
          style={{
            display: "block",
            cursor: "default",
            outline: "none",
          }}
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onWheel={onWheel}
          onContextMenu={(e) => e.preventDefault()}
          tabIndex={0}
        />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
