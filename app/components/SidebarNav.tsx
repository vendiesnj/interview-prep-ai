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
  CheckSquare,
  TrendingUp,
  Radio,
  ShieldCheck,
  Zap,
  Calendar,
} from "lucide-react";
import LogoutButton from "../components/LogoutButton";
import BillingSidebarButton from "@/app/components/BillingSidebarButton";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
};

const STUDENT_GROUPS: NavGroup[] = [
  {
    heading: "Platform",
    items: [
      { label: "Home", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "My Journey", href: "/my-journey", icon: <User size={18} /> },
      { label: "Planner", href: "/planner", icon: <Calendar size={18} /> },
    ],
  },
  {
    heading: "Practice",
    items: [
      { label: "Interview Prep", href: "/practice", icon: <Mic size={18} /> },
      { label: "Public Speaking", href: "/public-speaking", icon: <Radio size={18} /> },
      { label: "Networking Pitch", href: "/networking", icon: <TrendingUp size={18} /> },
    ],
  },
  {
    heading: "Resources",
    items: [
      { label: "Future-Proof Career", href: "/future-proof", icon: <ShieldCheck size={18} /> },
      { label: "Career Aptitude", href: "/aptitude", icon: <Zap size={18} /> },
      { label: "Career Guide", href: "/career-guide", icon: <BookOpen size={18} /> },
      { label: "Budget Builder", href: "/career-guide/budget", icon: <LineChart size={18} /> },
      { label: "Financial Literacy", href: "/financial-literacy", icon: <BarChart2 size={18} /> },
      { label: "Career Check-In", href: "/career-checkin", icon: <CheckSquare size={18} /> },
    ],
  },
  {
    heading: "Interview",
    items: [
      { label: "Question Bank", href: "/question-bank", icon: <LibraryBig size={18} /> },
      { label: "Job Profiles", href: "/job-profiles", icon: <Briefcase size={18} /> },
      { label: "Results", href: "/results", icon: <BarChart2 size={18} /> },
      { label: "Insights", href: "/progress", icon: <LineChart size={18} /> },
      { label: "Sessions", href: "/sessions", icon: <Clock size={18} /> },
    ],
  },
];

// Flat list for mobile drawer
const STUDENT_NAV_FLAT: NavItem[] = STUDENT_GROUPS.flatMap((g) => g.items);

const STUDENT_BOTTOM_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: <LayoutDashboard size={22} /> },
  { label: "Practice", href: "/practice", icon: <Mic size={22} /> },
  { label: "Resources", href: "/career-guide", icon: <BookOpen size={22} /> },
  { label: "Results", href: "/results", icon: <BarChart2 size={22} /> },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: <LayoutDashboard size={18} /> },
  { label: "Students", href: "/admin", icon: <Users size={18} /> },
];

const STORAGE_KEY = "ipc_sidebar_collapsed";

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const content = (
    <div
      title={item.label}
      style={{
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 10,
        padding: collapsed ? "9px 6px" : "9px 12px",
        borderRadius: 10,
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : item.comingSoon ? "var(--text-muted)" : "var(--text-primary)",
        fontWeight: active ? 900 : 800,
        fontSize: 13,
        width: "100%",
        boxSizing: "border-box" as const,
        boxShadow: active ? "var(--shadow-card-soft)" : "none",
        transition: "background 120ms ease",
        cursor: item.comingSoon ? "default" : "pointer",
        opacity: item.comingSoon ? 0.5 : 1,
      }}
    >
      <span aria-hidden="true" style={{ display: "grid", placeItems: "center", color: active ? "var(--accent)" : "var(--text-muted)", flex: "0 0 auto" }}>
        {item.icon}
      </span>
      {!collapsed && (
        <span style={{ fontSize: 13, fontWeight: active ? 900 : 800, color: active ? "var(--accent)" : item.comingSoon ? "var(--text-muted)" : "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
          {item.label}
        </span>
      )}
      {!collapsed && item.comingSoon && (
        <span style={{ fontSize: 9, fontWeight: 900, color: "var(--text-muted)", background: "var(--card-border-soft)", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const, letterSpacing: 0.4, flexShrink: 0 }}>
          Soon
        </span>
      )}
    </div>
  );

  if (item.comingSoon) return <div>{content}</div>;
  return <Link href={item.href} style={{ textDecoration: "none" }}>{content}</Link>;
}

export default function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const isAdmin = (session?.user as any)?.tenantRole === "tenant_admin";
  const [collapsed, setCollapsed] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    let isCollapsed = false;
    try { const saved = localStorage.getItem(STORAGE_KEY); isCollapsed = saved === "1"; } catch {}
    setCollapsed(isCollapsed);
    document.documentElement.style.setProperty("--ipc-sidebar-w", isCollapsed ? "72px" : "260px");
  }, []);

  React.useEffect(() => { setDrawerOpen(false); }, [pathname]);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
      document.documentElement.style.setProperty("--ipc-sidebar-w", next ? "72px" : "260px");
      return next;
    });
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));
  }

  // ── MOBILE ────────────────────────────────────────────────────────────────
  if (isMobile) {
    const BOTTOM_NAV = isAdmin ? ADMIN_NAV : STUDENT_BOTTOM_NAV;

    return (
      <>
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, height: 62, background: "var(--card-bg)", borderTop: "1px solid var(--card-border-soft)", display: "flex", alignItems: "stretch", backdropFilter: "blur(12px)" }}>
          {BOTTOM_NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, textDecoration: "none", color: active ? "var(--accent)" : "var(--text-muted)", background: active ? "var(--accent-soft)" : "transparent", fontSize: 10, fontWeight: active ? 900 : 700, borderTop: active ? "2px solid var(--accent)" : "2px solid transparent", transition: "color 120ms, background 120ms", padding: "6px 4px 2px" }}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}

          {!isAdmin && (
            <button type="button" onClick={() => setDrawerOpen(true)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: "none", background: "transparent", color: "var(--text-muted)", fontSize: 10, fontWeight: 700, cursor: "pointer", borderTop: "2px solid transparent", padding: "6px 4px 2px" }}>
              <MoreHorizontal size={22} />
              <span>More</span>
            </button>
          )}
        </nav>

        {drawerOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column" }}>
            <div onClick={() => setDrawerOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--card-bg)", borderTop: "1px solid var(--card-border-soft)", borderRadius: "20px 20px 0 0", padding: "12px 16px 40px", display: "flex", flexDirection: "column", gap: 4, maxHeight: "80vh", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--card-border)", margin: "0 auto" }} />
                <button type="button" onClick={() => setDrawerOpen(false)} style={{ position: "absolute", right: 16, top: 16, background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              {STUDENT_GROUPS.map((group) => (
                <div key={group.heading}>
                  <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, color: "var(--accent)", textTransform: "uppercase", padding: "10px 12px 4px" }}>{group.heading}</div>
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    if (item.comingSoon) return (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 16px", borderRadius: 14, opacity: 0.45 }}>
                        <span style={{ color: "var(--text-muted)", display: "grid", placeItems: "center" }}>{item.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-muted)" }}>{item.label}</span>
                        <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 900, color: "var(--text-muted)", background: "var(--card-border-soft)", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" as const }}>Soon</span>
                      </div>
                    );
                    return (
                      <Link key={item.href + item.label} href={item.href} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 16px", borderRadius: 14, textDecoration: "none", background: active ? "var(--accent-soft)" : "transparent", color: active ? "var(--accent)" : "var(--text-primary)", fontWeight: active ? 900 : 800, fontSize: 14 }}>
                        <span style={{ color: active ? "var(--accent)" : "var(--text-muted)", display: "grid", placeItems: "center" }}>{item.icon}</span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}

              <div style={{ marginTop: 8, padding: "0 4px", display: "grid", gap: 8 }}>
                <BillingSidebarButton collapsed={false} />
                <div style={{ borderRadius: 12, overflow: "hidden" }}><LogoutButton /></div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  return (
    <aside style={{ width: collapsed ? 72 : 260, flex: `0 0 ${collapsed ? 72 : 260}px`, height: "100vh", position: "sticky", top: 0, borderRight: "1px solid var(--card-border-soft)", background: "var(--card-bg)", padding: collapsed ? 12 : 16, boxSizing: "border-box", transition: "width 180ms ease, padding 180ms ease", overflow: "hidden", display: "flex", flexDirection: "column", color: "var(--text-primary)" }}>

      {/* Brand */}
      <div style={{ padding: collapsed ? "10px 6px 12px 6px" : "10px 10px 16px 10px", borderBottom: "1px solid var(--card-border-soft)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 10 }}>
        {!collapsed ? (
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <div style={{ fontSize: 15, fontWeight: 950, letterSpacing: -0.3, color: "var(--accent)" }}>
              {isAdmin ? "Career Center" : "Signal"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
              {isAdmin ? "Admin Console" : "Communication Platform"}
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" style={{ textDecoration: "none", fontSize: 15, color: "var(--accent)", fontWeight: 950 }}>
            {isAdmin ? "A" : "S"}
          </Link>
        )}

        <button type="button" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} style={{ width: 36, height: 36, borderRadius: 12, border: "none", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontSize: 18, fontWeight: 900, lineHeight: "34px", textAlign: "center", flex: "0 0 auto" }}>
          <span aria-hidden style={{ display: "inline-block", fontSize: 18, lineHeight: 1, opacity: 0.9 }}>≡</span>
        </button>
      </div>

      {/* Nav groups */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "8px 4px" : "8px 4px", marginTop: 4 }}>
        {isAdmin ? (
          <div style={{ display: "grid", gap: 3, padding: "4px 6px" }}>
            {ADMIN_NAV.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
            ))}
          </div>
        ) : (
          STUDENT_GROUPS.map((group) => (
            <div key={group.heading} style={{ marginBottom: 6 }}>
              {!collapsed && (
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", padding: "8px 12px 4px", opacity: 0.7 }}>
                  {group.heading}
                </div>
              )}
              <div style={{ display: "grid", gap: 2, padding: "0 6px" }}>
                {group.items.map((item) => (
                  <NavLink key={item.label} item={item} active={isActive(item.href)} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom */}
      <div style={{ padding: collapsed ? 8 : 10, display: "grid", gap: 8, borderTop: "1px solid var(--card-border-soft)", paddingTop: 12, marginTop: 4 }}>
        {!isAdmin && <BillingSidebarButton collapsed={collapsed} />}
        {!isAdmin && (
          <NavLink item={{ label: "Settings", href: "/settings", icon: <Settings size={18} /> }} active={isActive("/settings")} collapsed={collapsed} />
        )}
        {!isAdmin && (
          <NavLink item={{ label: "Account", href: "/account", icon: <User size={18} /> }} active={isActive("/account")} collapsed={collapsed} />
        )}
        <div style={{ borderRadius: 12, overflow: "hidden" }}>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
