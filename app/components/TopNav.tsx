"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { X, MoreHorizontal, ChevronLeft, Home, Mic, BarChart2, Map, HelpCircle } from "lucide-react";
import LogoutButton from "./LogoutButton";
import BillingSidebarButton from "./BillingSidebarButton";
import { useIsMobile } from "@/app/hooks/useIsMobile";
import { useIsUniversity } from "@/app/hooks/usePlan";
import HelpPanel from "./HelpPanel";
import { SignalLockup } from "./SignalLogo";

// ── Route label map ───────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard":                   "Dashboard",
  "/hub":                         "Practice",
  "/clarity":                     "Clarity & Articulation",
  "/planner":                     "My Plan",
  "/experience-log":              "Experience Log",
  "/practice":                    "Interview Practice",
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
  "/progress":                    "My Coach",
  "/history":                     "History",
  "/career-instincts":            "Career Instincts",
  "/job-tracker":                 "Job Tracker",
  "/admin":                       "Admin",
  "/games":                       "Daily Games",
  "/games/connections":           "Career Connections",
  "/games/hustle":                "Hustle",
  "/games/career-of-the-day":    "Career of the Day",
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
  { label: "Home",      href: "/dashboard",  Icon: Home },
  { label: "Practice",  href: "/hub",        Icon: Mic },
  { label: "Journey",   href: "/my-journey", Icon: BarChart2 },
  { label: "Explore",   href: "/career-guide", Icon: Map },
];

const MOBILE_DRAWER_LINKS_UNIVERSITY = [
  { label: "My Plan",              href: "/planner" },
  { label: "Experience Log",       href: "/experience-log" },
  { label: "Daily Games",          href: "/games" },
  { label: "Career Assessment",    href: "/aptitude" },
  { label: "Future-Proof",         href: "/future-proof" },
  { label: "Budget Builder",       href: "/career-guide/budget" },
  { label: "Financial Literacy",   href: "/financial-literacy" },
  { label: "Networking Pitch",     href: "/networking" },
  { label: "Public Speaking",      href: "/public-speaking" },
  { label: "Settings",             href: "/settings" },
  { label: "Account",              href: "/account" },
];

const MOBILE_DRAWER_LINKS_CONSUMER = [
  { label: "My Plan",              href: "/planner" },
  { label: "Experience Log",       href: "/experience-log" },
  { label: "Question Bank",        href: "/question-bank" },
  { label: "Job Profiles",         href: "/job-profiles" },
  { label: "Sessions",             href: "/sessions" },
  { label: "Public Speaking",      href: "/public-speaking" },
  { label: "Settings",             href: "/settings" },
  { label: "Account",              href: "/account" },
];

// ── Practice sub-nav routes ───────────────────────────────────────────────────

const PRACTICE_SUBNAV = [
  { label: "Practice Hub",  href: "/hub" },
  { label: "Question Bank", href: "/question-bank" },
  { label: "Sessions",      href: "/sessions" },
  { label: "Results",       href: "/results" },
  { label: "My Coach",      href: "/progress" },
];

// All routes that show the practice sub-nav (includes module pages even if not in subnav items)
const PRACTICE_EXTRA_PATHS = new Set([
  "/practice", "/mock-interview", "/public-speaking", "/clarity", "/networking",
]);

const PRACTICE_PATHS = new Set([...PRACTICE_SUBNAV.map(n => n.href), ...PRACTICE_EXTRA_PATHS]);

// ── Component ─────────────────────────────────────────────────────────────────

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const isAdmin = (session?.user as any)?.tenantRole === "tenant_admin";
  const isUniversity = useIsUniversity();
  const isDashboard = pathname === "/dashboard";
  const pageLabel = getPageLabel(pathname ?? "/dashboard");
  const tenantName = (session as any)?.tenant?.name as string | undefined;

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    // Practice hub tab highlights for all practice sub-routes
    if (href === "/hub") return PRACTICE_PATHS.has(pathname ?? "");
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

          <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}>
            <SignalLockup iconSize={26} />
          </Link>

          {tenantName && isDashboard && (
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", whiteSpace: "nowrap", flexShrink: 0 }}>
              {tenantName}
            </span>
          )}

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
                <item.Icon size={18} />
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
            <div onClick={() => setDrawerOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", cursor: "pointer" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--card-bg)", borderTop: "1px solid var(--card-border-soft)", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", maxHeight: "80vh", overflowY: "auto" }}>
              <button onClick={() => setDrawerOpen(false)} style={{ position: "absolute", right: 16, top: 16, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>More</div>
              {(isUniversity ? MOBILE_DRAWER_LINKS_UNIVERSITY : MOBILE_DRAWER_LINKS_CONSUMER).map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} style={{ display: "flex", alignItems: "center", padding: "11px 16px", borderRadius: "var(--radius-lg)", textDecoration: "none", color: isActive(item.href) ? "var(--accent)" : "var(--text-primary)", background: isActive(item.href) ? "var(--accent-soft)" : "transparent", fontWeight: 800, fontSize: 14, marginBottom: 2 }}>
                  {item.label}
                </Link>
              ))}
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                {!isAdmin && !tenantName && <BillingSidebarButton collapsed={false} />}
                <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}><LogoutButton /></div>
              </div>
            </div>
          </div>
        )}

        <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} isUniversity={isUniversity} />
      </>
    );
  }

  // ── DESKTOP ──────────────────────────────────────────────────────────────────
  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        height: 54, width: "100%",
        background: "var(--card-bg)",
        borderBottom: "1px solid var(--card-border-soft)",
        display: "flex", alignItems: "center",
        padding: "0 24px", gap: 0,
        boxSizing: "border-box",
      }}>
        {/* Logo - always links to dashboard */}
        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", marginRight: tenantName ? 12 : 20, flexShrink: 0 }}>
          <SignalLockup iconSize={28} />
        </Link>

        {/* Tenant name badge */}
        {tenantName && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16, flexShrink: 0 }}>
            <div style={{ width: 1, height: 18, background: "var(--card-border)" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)", letterSpacing: 0.1, whiteSpace: "nowrap" }}>
              {tenantName}
            </span>
          </div>
        )}

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
          {/* Help button */}
          <button
            onClick={() => setHelpOpen(true)}
            aria-label="Open help panel"
            title="Help"
            style={{
              padding: "5px 9px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 700,
              color: helpOpen ? "var(--accent)" : "var(--text-muted)",
              background: helpOpen ? "var(--accent-soft)" : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <HelpCircle size={15} />
            <span style={{ fontSize: 13 }}>?</span>
          </button>
          {isUniversity && (
            <Link href="/my-journey" style={{ padding: "5px 11px", borderRadius: 7, fontSize: 13, fontWeight: 700, color: isActive("/my-journey") ? "var(--accent)" : "var(--text-muted)", background: isActive("/my-journey") ? "var(--accent-soft)" : "transparent", textDecoration: "none" }}>
              My Journey
            </Link>
          )}
          {!isAdmin && (
            <Link href="/planner" style={{ padding: "5px 11px", borderRadius: 7, fontSize: 13, fontWeight: 700, color: isActive("/planner") ? "var(--accent)" : "var(--text-muted)", background: isActive("/planner") ? "var(--accent-soft)" : "transparent", textDecoration: "none" }}>
              My Plan
            </Link>
          )}
          <Link href="/settings" style={{ padding: "5px 11px", borderRadius: 7, fontSize: 13, fontWeight: 700, color: isActive("/settings") ? "var(--accent)" : "var(--text-muted)", background: isActive("/settings") ? "var(--accent-soft)" : "transparent", textDecoration: "none" }}>
            Settings
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* Practice sub-nav */}
      {PRACTICE_PATHS.has(pathname ?? "") && (
        <div style={{
          position: "sticky", top: 54, zIndex: 99,
          background: "var(--card-bg)",
          borderBottom: "1px solid var(--card-border-soft)",
          display: "flex", alignItems: "center",
          padding: "0 24px", gap: 2,
          height: 40,
        }}>
          {PRACTICE_SUBNAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "6px 12px", borderRadius: "var(--radius-xs)",
                  fontSize: 12, fontWeight: active ? 800 : 600,
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  textDecoration: "none",
                  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                  transition: "all 120ms",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} isUniversity={isUniversity} />
    </>
  );
}
