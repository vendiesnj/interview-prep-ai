"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Mic,
  BarChart2,
  LineChart,
  Clock,
  User,
  Settings,
  Briefcase,
  LibraryBig,
  Users,
  MoreHorizontal,
  X,
  BookOpen,
} from "lucide-react";
import LogoutButton from "../components/LogoutButton";
import BillingSidebarButton from "@/app/components/BillingSidebarButton";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const STUDENT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Practice", href: "/practice", icon: <Mic size={18} /> },
  { label: "Question Bank", href: "/question-bank", icon: <LibraryBig size={18} /> },
  { label: "Job Profiles", href: "/job-profiles", icon: <Briefcase size={18} /> },
  { label: "Results", href: "/results", icon: <BarChart2 size={18} /> },
  { label: "Insights", href: "/progress", icon: <LineChart size={18} /> },
  { label: "Sessions", href: "/sessions", icon: <Clock size={18} /> },
  { label: "Career Guide", href: "/career-guide", icon: <BookOpen size={18} /> },
  { label: "Settings", href: "/settings", icon: <Settings size={18} /> },
  { label: "Account", href: "/account", icon: <User size={18} /> },
];

// Bottom nav shows the 4 most important items + "More" drawer
const STUDENT_BOTTOM_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: <LayoutDashboard size={22} /> },
  { label: "Practice", href: "/practice", icon: <Mic size={22} /> },
  { label: "Results", href: "/results", icon: <BarChart2 size={22} /> },
  { label: "Insights", href: "/progress", icon: <LineChart size={22} /> },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: <LayoutDashboard size={18} /> },
  { label: "Students", href: "/admin", icon: <Users size={18} /> },
];

const STORAGE_KEY = "ipc_sidebar_collapsed";

export default function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const isAdmin = (session?.user as any)?.tenantRole === "tenant_admin";
  const NAV = isAdmin ? ADMIN_NAV : STUDENT_NAV;
  const [collapsed, setCollapsed] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    let isCollapsed = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      isCollapsed = saved === "1";
    } catch {}
    setCollapsed(isCollapsed);
    document.documentElement.style.setProperty(
      "--ipc-sidebar-w",
      isCollapsed ? "72px" : "260px"
    );
  }, []);

  // Close drawer on route change
  React.useEffect(() => { setDrawerOpen(false); }, [pathname]);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
      document.documentElement.style.setProperty("--ipc-sidebar-w", next ? "72px" : "260px");
      return next;
    });
  }

  // ── MOBILE: bottom tab bar ────────────────────────────────────────────────
  if (isMobile) {
    const BOTTOM_NAV = isAdmin ? ADMIN_NAV : STUDENT_BOTTOM_NAV;

    return (
      <>
        {/* Bottom tab bar */}
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            height: 62,
            background: "var(--card-bg)",
            borderTop: "1px solid var(--card-border-soft)",
            display: "flex",
            alignItems: "stretch",
            backdropFilter: "blur(12px)",
          }}
        >
          {BOTTOM_NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  textDecoration: "none",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  fontSize: 10,
                  fontWeight: active ? 900 : 700,
                  borderTop: active ? "2px solid var(--accent)" : "2px solid transparent",
                  transition: "color 120ms, background 120ms",
                  padding: "6px 4px 2px",
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* More button — only for students */}
          {!isAdmin && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                borderTop: "2px solid transparent",
                padding: "6px 4px 2px",
              }}
            >
              <MoreHorizontal size={22} />
              <span>More</span>
            </button>
          )}
        </nav>

        {/* Full-screen "More" drawer */}
        {drawerOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Backdrop */}
            <div
              onClick={() => setDrawerOpen(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }}
            />

            {/* Drawer panel */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "var(--card-bg)",
                borderTop: "1px solid var(--card-border-soft)",
                borderRadius: "20px 20px 0 0",
                padding: "12px 16px 40px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {/* Handle + close */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--card-border)", margin: "0 auto" }} />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  style={{ position: "absolute", right: 16, top: 16, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase", padding: "4px 12px 8px" }}>
                Navigation
              </div>

              {STUDENT_NAV.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "13px 16px",
                      borderRadius: 14,
                      textDecoration: "none",
                      background: active ? "var(--accent-soft)" : "transparent",
                      color: active ? "var(--accent)" : "var(--text-primary)",
                      fontWeight: active ? 900 : 800,
                      fontSize: 15,
                    }}
                  >
                    <span style={{ color: active ? "var(--accent)" : "var(--text-muted)", display: "grid", placeItems: "center" }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}

              <div style={{ marginTop: 8, padding: "0 4px", display: "grid", gap: 8 }}>
                <BillingSidebarButton collapsed={false} />
                <div style={{ borderRadius: 12, overflow: "hidden" }}>
                  <LogoutButton />
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── DESKTOP: left sidebar ─────────────────────────────────────────────────
  return (
    <aside
      style={{
        width: collapsed ? 72 : 260,
        flex: `0 0 ${collapsed ? 72 : 260}px`,
        height: "100vh",
        position: "sticky",
        top: 0,
        borderRight: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
        padding: collapsed ? 12 : 16,
        boxSizing: "border-box",
        transition: "width 180ms ease, padding 180ms ease",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          padding: collapsed ? "10px 6px 12px 6px" : "10px 10px 16px 10px",
          borderBottom: "1px solid var(--card-border-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 10,
        }}
      >
        {!collapsed ? (
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase" as const }}>
              {isAdmin ? "Career Center" : "Performance Suite"}
            </div>
            {isAdmin ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Admin Console</div>
            ) : null}
          </Link>
        ) : (
          <Link href="/" style={{ textDecoration: "none", fontSize: 14, color: "var(--text-primary)", fontWeight: 950 }}>
            {isAdmin ? "A" : "IC"}
          </Link>
        )}

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: 36, height: 36, borderRadius: 12, border: "none",
            background: "transparent", color: "var(--text-primary)",
            cursor: "pointer", fontSize: 18, fontWeight: 900,
            lineHeight: "34px", textAlign: "center", flex: "0 0 auto",
          }}
        >
          <span aria-hidden style={{ display: "inline-block", fontSize: 18, lineHeight: 1, opacity: 0.9 }}>≡</span>
        </button>
      </div>

      <nav style={{ display: "grid", gap: 4, padding: collapsed ? 8 : 10, marginTop: 10 }}>
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 10,
                padding: collapsed ? "10px 6px" : "10px 12px",
                borderRadius: 12,
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-primary)",
                fontWeight: active ? 900 : 800,
                fontSize: 13,
                width: "100%",
                boxSizing: "border-box",
                boxShadow: active ? "var(--shadow-card-soft)" : "none",
                transition: "background 120ms ease",
              }}
            >
              <span aria-hidden="true" style={{ display: "grid", placeItems: "center", color: active ? "var(--accent)" : "var(--text-muted)", flex: "0 0 auto" }}>
                {item.icon}
              </span>
              {!collapsed ? (
                <div style={{ fontSize: 13, fontWeight: active ? 900 : 800, color: active ? "var(--accent)" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.label}
                </div>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto" }} />

      <div style={{ padding: collapsed ? 8 : 10, display: "grid", gap: 8 }}>
        {!isAdmin && <BillingSidebarButton collapsed={collapsed} />}
        {!isAdmin && (
          <Link
            href="/settings"
            title="Settings"
            style={{
              textDecoration: "none", padding: collapsed ? "10px 10px" : "10px 12px",
              borderRadius: 12, border: "none", background: "transparent",
              color: "var(--text-muted)", fontWeight: 900, fontSize: 13, textAlign: "center",
            }}
          >
            {!collapsed ? "Settings" : "⚙"}
          </Link>
        )}
        <div style={{ borderRadius: 12, overflow: "hidden" }}>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
