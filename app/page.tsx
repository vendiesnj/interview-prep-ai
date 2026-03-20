import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signal — Something big is coming",
  description:
    "Signal is a communication and career development platform built for students and new professionals. From pre-college to your first years in the workforce — we cover it all.",
  openGraph: {
    title: "Signal — Something big is coming",
    description:
      "A career platform built for every stage. Pre-college, during college, and your first years in the workforce. Launching soon.",
    type: "website",
  },
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `
          radial-gradient(900px 600px at 20% 0%, rgba(37,99,235,0.07), transparent 60%),
          radial-gradient(700px 500px at 85% 10%, rgba(14,165,233,0.05), transparent 60%),
          #0a0f1a
        `,
        fontFamily: "var(--font-manrope, system-ui, sans-serif)",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      {/* Logo mark */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 0 32px rgba(37,99,235,0.4)",
          }}
        >
          💬
        </div>
        <div style={{ fontSize: 24, fontWeight: 950, color: "#fff", letterSpacing: -0.5 }}>
          Signal
        </div>
      </div>

      {/* Main card */}
      <div
        style={{
          maxWidth: 560,
          width: "100%",
          padding: "48px 40px",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          textAlign: "center",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 99,
            border: "1px solid rgba(37,99,235,0.4)",
            background: "rgba(37,99,235,0.1)",
            fontSize: 12,
            fontWeight: 900,
            color: "#60A5FA",
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#60A5FA", display: "inline-block", boxShadow: "0 0 8px #60A5FA" }} />
          Major update in progress
        </div>

        <h1
          style={{
            margin: "0 0 16px",
            fontSize: 42,
            fontWeight: 950,
            color: "#fff",
            lineHeight: 1.15,
            letterSpacing: -1,
          }}
        >
          Big changes<br />
          <span style={{ background: "linear-gradient(135deg, #2563EB, #0EA5E9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            are coming.
          </span>
        </h1>

        <p
          style={{
            margin: "0 0 36px",
            fontSize: 16,
            color: "rgba(255,255,255,0.55)",
            lineHeight: 1.75,
          }}
        >
          We&apos;re rebuilding from the ground up — a full communication and career platform for every stage of your journey. Pre-college through your first years in the workforce.
        </p>

        {/* Three stage pills */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 40,
          }}
        >
          {[
            { label: "Pre-College", icon: "🎓", color: "#10B981" },
            { label: "During College", icon: "📚", color: "#2563EB" },
            { label: "Post-College", icon: "🚀", color: "#8B5CF6" },
          ].map(({ label, icon, color }) => (
            <div
              key={label}
              style={{
                padding: "8px 16px",
                borderRadius: 99,
                border: `1px solid ${color}40`,
                background: `${color}12`,
                fontSize: 13,
                fontWeight: 800,
                color,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span>{icon}</span>
              {label}
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/login"
            style={{
              padding: "13px 28px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 950,
              fontSize: 15,
              boxShadow: "0 4px 24px rgba(37,99,235,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            Log in →
          </Link>
          <Link
            href="/signup"
            style={{
              padding: "13px 28px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.85)",
              textDecoration: "none",
              fontWeight: 900,
              fontSize: 15,
              whiteSpace: "nowrap",
            }}
          >
            Create account
          </Link>
        </div>
      </div>

      {/* Bottom note */}
      <p
        style={{
          marginTop: 32,
          fontSize: 13,
          color: "rgba(255,255,255,0.25)",
          textAlign: "center",
        }}
      >
        Already have an account?{" "}
        <Link href="/login" style={{ color: "rgba(255,255,255,0.45)", fontWeight: 800, textDecoration: "none" }}>
          Log in to access the platform →
        </Link>
      </p>
    </main>
  );
}
