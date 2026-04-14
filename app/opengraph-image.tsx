import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Signal HQ — AI Interview Practice & Career Coaching";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "60px 72px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Background accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo / brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, #2563EB, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 20, height: 20, background: "#fff", borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
            Signal HQ
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#60A5FA",
            }}
          >
            AI Interview Coaching
          </div>
          <div
            style={{
              fontSize: 62,
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Know exactly how you interview.
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.5,
              fontWeight: 400,
            }}
          >
            7-dimension analysis · Delivery archetypes · Vocal signals
          </div>
        </div>

        {/* Bottom stat row */}
        <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
          {[
            { label: "Dimensions Scored", value: "7" },
            { label: "Feedback Archetypes", value: "15" },
            { label: "Universities", value: "Growing" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>{stat.value}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
                {stat.label}
              </span>
            </div>
          ))}
          <div
            style={{
              marginLeft: "auto",
              padding: "12px 28px",
              borderRadius: 999,
              background: "#2563EB",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            signalhq.us
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
