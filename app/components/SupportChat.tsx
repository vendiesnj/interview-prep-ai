"use client";

import { useEffect, useRef, useState } from "react";
import { X, MessageCircle, Send, ChevronDown } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STARTERS = [
  "How do I get tailored questions for a job?",
  "What is a Delivery Pattern?",
  "How does scoring work?",
  "I have a feature suggestion",
];

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = data.reply ?? "Something went wrong. Try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!open) setUnread(true);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Couldn't reach the server. Check your connection." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open support chat"
        style={{
          position: "fixed",
          bottom: 20,
          right: 16,
          zIndex: 1001,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--accent)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          transition: "transform 120ms ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? <ChevronDown size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
        {unread && !open && (
          <span style={{
            position: "absolute", top: 4, right: 4,
            width: 10, height: 10, borderRadius: "50%",
            background: "#EF4444",
            border: "2px solid var(--app-bg, #0f172a)",
          }} />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: 84,
          right: 16,
          zIndex: 1001,
          width: "min(340px, calc(100vw - 32px))",
          maxHeight: "min(70vh, 520px)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--card-border)",
          background: "var(--app-bg, #0f172a)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--card-border-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--app-bg, #0f172a)",
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Help & Feedback</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Ask a question or suggest a feature</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}>
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  How can I help you today?
                </div>
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--card-border)",
                      background: "var(--card-bg-strong)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                      cursor: "pointer",
                      lineHeight: 1.4,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div style={{
                  maxWidth: "82%",
                  padding: "9px 12px",
                  borderRadius: msg.role === "user"
                    ? "14px 14px 4px 14px"
                    : "14px 14px 14px 4px",
                  background: msg.role === "user"
                    ? "var(--accent)"
                    : "var(--card-bg-strong)",
                  color: msg.role === "user" ? "#fff" : "var(--text-primary)",
                  fontSize: 13,
                  lineHeight: 1.55,
                  border: msg.role === "user" ? "none" : "1px solid var(--card-border-soft)",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "9px 14px",
                  borderRadius: "14px 14px 14px 4px",
                  background: "var(--card-bg-strong)",
                  border: "1px solid var(--card-border-soft)",
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--text-muted)",
                      display: "inline-block",
                      animation: `chatDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px",
            borderTop: "1px solid var(--card-border-soft)",
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            background: "var(--app-bg, #0f172a)",
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                border: "1px solid var(--card-border)",
                borderRadius: "var(--radius-md)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                padding: "8px 10px",
                outline: "none",
                lineHeight: 1.5,
                maxHeight: 100,
                overflowY: "auto",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: input.trim() && !loading ? "var(--accent)" : "var(--card-border)",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 120ms ease",
              }}
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatDot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
