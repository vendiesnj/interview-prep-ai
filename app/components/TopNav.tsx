"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { X, MoreHorizontal, ChevronLeft } from "lucide-react";
import LogoutButton from "./LogoutButton";
import BillingSidebarButton from "./BillingSidebarButton";
import { useIsMobile } from "@/app/hooks/useIsMobile";

// ── Route label map ───────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard":                   "Dashboard",
  "/practice":                    "Interview Prep",
  "/public-speaking":             "Public Speaking",
  "/networking":                  "Networking Pitch",
  "/aptitude":                    "Career Assessment",
  "/career-guide":                "Career Guide",
  "/career-guide/career-paths":   "Career Paths",
  "/career-guide/budget":         "Budget Builder",
  "/career-guide/retirement":     "Retirement Projection",
  "/career-guide/housing":        "Housing Guide",
  "/career-guide/benchmarks":     "Benchmarks",
  "/career-guide/first-year":     "First-Year Guide",
  "/career-guide/finances":       "Financial Guide",
  "/financial-literacy":          "Financial Literacy",
  "/future-proof":                "Future-Proof",
  "/planner":                     "Planner",
  "/my-journey":                  "My Journey",
  "/settings":                    "Settings",
  "/account":                     "Account",
  "/pre-college":                 "Stage Guide",
  "/during-college":              "Stage Guide",
  "/post-college":                "Stage Guide",
  "/career-checkin":              "Career Check-In",
  "/resume-gap":                  "Resume Gap Analyzer",
  "/mock-interview":              "Mock Interview",
  "/question-bank":               "Question Bank",
  "/job-profiles":                "Job Profiles",
  "/sessions":                    "Sessions",
  "/results":                     "Results",
  "/progress":                    "Insights",
  "/history":                     "History",
  "/career-instincts":            "Career Instincts",
  "/admin":                       "Admin",
};

function getPageLabel(pathname: string): string {
  // Exact match first
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];

  // Strip trailing slash and try again
  const clean = pathname.replace(/\/$/, "");
  if (ROUTE_LABELS[clean]) return ROUTE_LABELS[clean];

  // Dynamic segments: /career-guide/career-paths/[occupation]
  if (clean.startsWith("/career-guide/career-paths/")) return "Career Path";

  // Parent match (longest matching prefix)
  const parts = clean.split("/");
  while (parts.length > 1) {
    parts.pop();
    const parent = parts.join("/");
    if (ROUTE_LABELS[parent]) return ROUTE_LABELS[parent];
  }

  // Fallback: capitalize last segment
  const last = clean.split("/").pop() ?? "";
  return last.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Mobile nav items ──────────────────────────────────────────────────────────

const MOBILE_NAV = [
  { label: "Home",      href: "/dashboard",      icon: "🏠" },
  { label: "Practice",  href: "/practice",        icon: "🎙️" },
  { label: "Journey",   href: "/my-journey",      icon: "📊" },
  { label: "Explore",   href: "/career-guide",    icon: "🗺️" },
];

const MOBILE_DRAWER_LINKS = [
  { label: "Planner",              href: "/planner" },
  { label: "Career Assessment",    href: "/aptitude" },
  { label: "Future-Proof",         href: "/future-proof" },
  { label: "Budget Builder",       href: "/career-guide/budget" },
  { label: "Financial Literacy",   href: "/financial-literacy" },
  { label: "Networking Pitch",     href: "/networking" },
  { label: "Public Speaking",      href: "/public-speaking" },
  { label: "Settings",             href: "/settings" },
  { label: "Account",              href: "/account" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = (session?.user as any)?.tenantRole === "tenant_admin";
  const isDashboard = pathname === "/dashboard";
  const pageLabel = getPageLabel(pathname ?? "/dashboard");

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname?.startsWith(href + "/");
  }

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Mobile top bar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 100, height: 52,
          background: "var(--card-bg)", borderBottom: "1px solid var(--card-border-soft)",
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 16px", backdropFilter: "blur(12px)",
        }}>
          {!isDashboard ? (
            <button
              onClick={() => router.back()}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px 2px", display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
            >
              <ChevronLeft size={18} />
            </button>
          ) : null}

          <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #2563EB, #0EA5E9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>💬</div>
            <span style={{ fontSize: 15, fontWeight: 950, color: "var(--accent)", letterSpacing: -0.3 }}>Signal</span>
          </Link>

          {!isDashboard && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              / {pageLabel}
            </span>
          )}

          <button onClick={() => setDrawerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", padding: 4, marginLeft: "auto", flexShrink: 0 }}>
            <MoreHorizontal size={22} />
          </button>
        </header>

        {/* Mobile bottom nav */}
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, height: 62,
          background: "var(--card-bg)", borderTop: "1px solid var(--card-border-soft)",
          display: "flex", alignItems: "stretch",
        }}>
          {MOBILE_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 2, textDecoration: "none",
                color: active ? "var(--accent)" : "var(--text-muted)",
                background: active ? "var(--accent-soft)" : "transparent",
                fontSize: 10, fontWeight: active ? 900 : 700,
                borderTop: active ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setDrawerOpen(true)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 2, border: "none", background: "transparent",
            color: "var(--text-muted)", fontSize: 10, fontWeight: 700, cursor: "pointer",
            borderTop: "2px solid transparent",
          }}>
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>
        </nav>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
            <div onClick={() => setDrawerOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--card-bg)", borderTop: "1px solid var(--card-border-soft)", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", maxHeight: "80vh", overflowY: "auto" }}>
              <button onClick={() => setDrawerOpen(false)} style={{ position: "absolute", right: 16, top: 16, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>More</div>
              {MOBILE_DRAWER_LINKS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} style={{ display: "flex", alignItems: "center", padding: "11px 16px", borderRadius: 12, textDecoration: "none", color: isActive(item.href) ? "var(--accent)" : "var(--text-primary)", background: isActive(item.href) ? "var(--accent-soft)" : "transparent", fontWeight: 800, fontSize: 14, marginBottom: 2 }}>
                  {item.label}
                </Link>
              ))}
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                <BillingSidebarButton collapsed={false} />
                <div style={{ borderRadius: 12, overflow: "hidden" }}><LogoutButton /></div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── DESKTOP ──────────────────────────────────────────────────────────────────
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      height: 54, width: "100%",
      background: "var(--card-bg)",
      borderBottom: "1px solid var(--card-border-soft)",
      display: "flex", alignItems: "center",
      padding: "0 24px", gap: 0,
      boxSizing: "border-box",
    }}>
      {/* Logo — always links to dashboard */}
      <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, marginRight: 20, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #2563EB, #0EA5E9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💬</div>
        <span style={{ fontSize: 15, fontWeight: 950, color: "var(--accent)", letterSpacing: -0.3 }}>Signal</span>
      </Link>

      {/* Breadcrumb / back nav */}
      {!isAdmin && !isDashboard && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link
            href="/dashboard"
            style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 7, textDecoration: "none", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)", transition: "color 120ms" }}
          >
            <ChevronLeft size={14} />
            Dashboard
          </Link>
          <span style={{ fontSize: 13, color: "var(--card-border)" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{pageLabel}</span>
        </div>
      )}

      {isDashboard && !isAdmin && (
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Dashboard</span>
      )}

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
        <BillingSidebarButton collapsed={true} />
        <Link href="/planner" style={{ padding: "5px 11px", borderRadius: 7, fontSize: 13, fontWeight: 700, color: isActive("/planner") ? "var(--accent)" : "var(--text-muted)", background: isActive("/planner") ? "var(--accent-soft)" : "transparent", textDecoration: "none" }}>
          Planner
        </Link>
        <Link href="/my-journey" style={{ padding: "5px 11px", borderRadius: 7, fontSize: 13, fontWeight: 700, color: isActive("/my-journey") ? "var(--accent)" : "var(--text-muted)", background: isActive("/my-journey") ? "var(--accent-soft)" : "transparent", textDecoration: "none" }}>
          My Journey
        </Link>
        <Link href="/settings" style={{ padding: "5px 11px", borderRadius: 7, fontSize: 13, fontWeight: 700, color: isActive("/settings") ? "var(--accent)" : "var(--text-muted)", background: isActive("/settings") ? "var(--accent-soft)" : "transparent", textDecoration: "none" }}>
          Settings
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
