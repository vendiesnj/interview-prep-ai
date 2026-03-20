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
} from "lucide-react";
import LogoutButton from "../components/LogoutButton";
import BillingSidebarButton from "@/app/components/BillingSidebarButton";

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
  { label: "Settings", href: "/settings", icon: <Settings size={18} /> },
  { label: "Account", href: "/account", icon: <User size={18} /> },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: <LayoutDashboard size={18} /> },
  { label: "Students", href: "/admin", icon: <Users size={18} /> },
];

const STORAGE_KEY = "ipc_sidebar_collapsed";

export default function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.tenantRole === "tenant_admin";
  const NAV = isAdmin ? ADMIN_NAV : STUDENT_NAV;
  const [collapsed, setCollapsed] = React.useState(false);

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

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;

      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}

      document.documentElement.style.setProperty(
        "--ipc-sidebar-w",
        next ? "72px" : "260px"
      );

      return next;
    });
  }

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
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.7,
                color: "var(--accent)",
                textTransform: "uppercase" as const,
              }}
            >
              {isAdmin ? "Career Center" : "Performance Suite"}
            </div>
            {isAdmin ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Admin Console
              </div>
            ) : null}
          </div>
        ) : (
          <div
            style={{
              fontSize: 14,
              color: "var(--text-primary)",
              fontWeight: 950,
            }}
          >
            {isAdmin ? "A" : "IC"}
          </div>
        )}

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            border: "none",
            background: "transparent",
            color: "var(--text-primary)",
            cursor: "pointer",
            fontSize: 18,
            fontWeight: 900,
            lineHeight: "34px",
            textAlign: "center",
            flex: "0 0 auto",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-block",
              fontSize: 18,
              lineHeight: 1,
              opacity: 0.9,
            }}
          >
            ≡
          </span>
        </button>
      </div>

      <nav
        style={{
          display: "grid",
          gap: 4,
          padding: collapsed ? 8 : 10,
          marginTop: 10,
        }}
      >
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              style={{
                textDecoration: "none",
                display: "flex",
                flexDirection: collapsed ? "column" : "row",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: collapsed ? 6 : 10,
                padding: collapsed ? "10px 6px" : "10px 12px",
                borderRadius: 12,
                border: "none",
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-primary)",
                fontWeight: active ? 900 : 800,
                fontSize: 13,
                minWidth: 0,
                width: "100%",
                boxSizing: "border-box",
                boxShadow: active ? "var(--shadow-card-soft)" : "none",
                transition: "background 120ms ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: 10,
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    flex: "0 0 auto",
                  }}
                >
                  {item.icon}
                </span>

                {!collapsed ? (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: active ? 900 : 800,
                      color: active ? "var(--accent)" : "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.label}
                  </div>
                ) : null}
              </div>
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
              textDecoration: "none",
              padding: collapsed ? "10px 10px" : "10px 12px",
              borderRadius: 12,
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              fontWeight: 900,
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {!collapsed ? "Settings" : "⚙"}
          </Link>
        )}

        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}