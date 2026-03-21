"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { X, MoreHorizontal } from "lucide-react";
import LogoutButton from "./LogoutButton";
import BillingSidebarButton from "./BillingSidebarButton";
import { useIsMobile } from "@/app/hooks/useIsMobile";

const STAGE_TABS = [
  { id: "pre_college",     label: "Pre-College",    icon: "🎓", href: "/pre-college",     color: "#10B981" },
  { id: "during_college",  label: "During College", icon: "📚", href: "/during-college",  color: "#2563EB" },
  { id: "post_college",    label: "Post-College",   icon: "🚀", href: "/post-college",    color: "#8B5CF6" },
] as const;

const TOOL_LINKS = [
  { label: "Interview Prep", href: "/practice" },
  { label: "Public Speaking", href: "/public-speaking" },
  { label: "Networking", href: "/networking" },
  { label: "Financial Literacy", href: "/financial-literacy" },
  { label: "Career Instincts", href: "/career-instincts" },
  { label: "My Journey", href: "/my-journey" },
];

const INTERVIEW_PREP_ROUTES = [
  "/practice",
  "/question-bank",
  "/job-profiles",
  "/resume-gap",
  "/results",
  "/progress",
  "/sessions",
];

const INTERVIEW_PREP_TABS = [
  { href: "/practice", label: "Practice" },
  { href: "/question-bank", label: "Question Bank" },
  { href: "/job-profiles", label: "Job Profiles" },
  { href: "/resume-gap", label: "Resume" },
  { href: "/results", label: "Results" },
  { href: "/progress", label: "Insights" },
  { href: "/sessions", label: "Sessions" },
];

const MOBILE_BOTTOM = [
  { label: "Pre-College",   href: "/pre-college",   icon: "🎓" },
  { label: "During",        href: "/during-college", icon: "📚" },
  { label: "Post-College",  href: "/post-college",  icon: "🚀" },
  { label: "Practice",      href: "/practice",      icon: "🎙️" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAdmin = (session?.user as any)?.tenantRole === "tenant_admin";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname?.startsWith(href + "/");
  }

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Mobile top bar - logo + menu */}
        <header style={{
          position: "sticky", top: 0, zIndex: 100, height: 52,
          background: "var(--card-bg)", borderBottom: "1px solid var(--card-border-soft)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", backdropFilter: "blur(12px)",
        }}>
          <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #2563EB, #0EA5E9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💬</div>
            <span style={{ fontSize: 16, fontWeight: 950, color: "var(--accent)", letterSpacing: -0.3 }}>Signal</span>
          </Link>
          <button onClick={() => setDrawerOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", padding: 4 }}>
            <MoreHorizontal size={22} />
          </button>
        </header>

        {/* Mobile bottom nav */}
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, height: 62,
          background: "var(--card-bg)", borderTop: "1px solid var(--card-border-soft)",
          display: "flex", alignItems: "stretch",
        }}>
          {MOBILE_BOTTOM.map((item) => {
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

        {/* Drawer */}
        {drawerOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column" }}>
            <div onClick={() => setDrawerOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--card-bg)", borderTop: "1px solid var(--card-border-soft)", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", maxHeight: "80vh", overflowY: "auto" }}>
              <button onClick={() => setDrawerOpen(false)} style={{ position: "absolute", right: 16, top: 16, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>Tools</div>
              {TOOL_LINKS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderRadius: 12, textDecoration: "none", color: isActive(item.href) ? "var(--accent)" : "var(--text-primary)", background: isActive(item.href) ? "var(--accent-soft)" : "transparent", fontWeight: 800, fontSize: 14, marginBottom: 2 }}>
                  {item.label}
                </Link>
              ))}
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginTop: 16, marginBottom: 12 }}>Interview Prep</div>
              {INTERVIEW_PREP_TABS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderRadius: 12, textDecoration: "none", color: isActive(item.href) ? "var(--accent)" : "var(--text-primary)", background: isActive(item.href) ? "var(--accent-soft)" : "transparent", fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
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
  const showInterviewSubNav = !isAdmin && INTERVIEW_PREP_ROUTES.some((r) => pathname?.startsWith(r));

  return (
    <>
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      height: 56, width: "100%",
      background: "var(--card-bg)",
      borderBottom: showInterviewSubNav ? "none" : "1px solid var(--card-border-soft)",
      display: "flex", alignItems: "center",
      padding: "0 24px", gap: 0,
      boxSizing: "border-box",
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9, marginRight: 32, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg, #2563EB, #0EA5E9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>💬</div>
        <span style={{ fontSize: 16, fontWeight: 950, color: "var(--accent)", letterSpacing: -0.3 }}>Signal</span>
      </Link>

      {/* Stage tabs */}
      {!isAdmin && (
        <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
          {STAGE_TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "6px 14px", borderRadius: 8,
                  textDecoration: "none", fontWeight: active ? 950 : 800,
                  fontSize: 13, transition: "all 150ms",
                  color: active ? tab.color : "var(--text-muted)",
                  background: active ? tab.color + "15" : "transparent",
                  border: active ? `1px solid ${tab.color}40` : "1px solid transparent",
                }}
              >
                <span style={{ fontSize: 15 }}>{tab.icon}</span>
                {tab.label}
              </Link>
            );
          })}

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: "var(--card-border-soft)", margin: "0 10px" }} />

          {/* Tool links */}
          {TOOL_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: "6px 12px", borderRadius: 8, textDecoration: "none",
                fontSize: 13, fontWeight: isActive(item.href) ? 900 : 700,
                color: isActive(item.href) ? "var(--text-primary)" : "var(--text-muted)",
                background: isActive(item.href) ? "var(--card-bg-strong)" : "transparent",
                transition: "all 150ms",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
        <BillingSidebarButton collapsed={true} />
        <Link href="/settings" style={{ padding: "6px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textDecoration: "none" }}>
          Settings
        </Link>
        <LogoutButton />
      </div>
    </header>

    {showInterviewSubNav && (
      <nav style={{
        position: "sticky", top: 56, zIndex: 99,
        background: "var(--card-bg)",
        borderBottom: "1px solid var(--card-border-soft)",
        padding: "0 24px",
        display: "flex", alignItems: "center", gap: 4,
        height: 44,
        boxSizing: "border-box",
        overflowX: "auto",
      }}>
        {INTERVIEW_PREP_TABS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: "none",
                padding: "5px 12px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: active ? 900 : 700,
                color: active ? "var(--accent)" : "var(--text-muted)",
                background: active ? "var(--accent-soft)" : "transparent",
                whiteSpace: "nowrap",
                transition: "all 120ms",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    )}
    </>
  );
}
