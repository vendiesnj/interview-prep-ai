import React from "react";
import type { ReactNode } from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SidebarNav from "../components/SidebarNav";
import HelpPanel from "../components/HelpPanel";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?from=/dashboard");

  const isAdmin = (session?.user as any)?.tenantRole === "tenant_admin";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SidebarNav />
      <main
        className="ipc-main-content"
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
      {!isAdmin && <HelpPanel />}
    </div>
  );
}