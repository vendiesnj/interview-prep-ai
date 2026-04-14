import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Signal HQ — AI Interview Practice";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 72px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          gap: 60,
        }}
      >
        {/* Left: text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, #2563EB, #7C3AED)",
              }}
            />
            <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Signal HQ</span>
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: -1.5 }}>
            AI-powered interview coaching
          </div>
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
            7-dimension scoring · Vocal analysis · Personalized feedback
          </div>
        </div>

        {/* Right: mock score card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "28px 32px",
            minWidth: 280,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#60A5FA", letterSpacing: 1, textTransform: "uppercase" }}>
            Your Signal
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, color: "#fff", lineHeight: 1 }}>74</div>
          <div style={{ fontSize: 13, color: "#F59E0B", fontWeight: 700 }}>Developing → Ready</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {[
              { label: "Narrative Clarity", w: 64 },
              { label: "Evidence Quality", w: 41 },
              { label: "Ownership & Agency", w: 78 },
            ].map((d) => (
              <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", minWidth: 130 }}>{d.label}</span>
                <div style={{ flex: 1, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.1)" }}>
                  <div style={{ height: "100%", width: `${d.w}%`, background: "#2563EB", borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
