import React from "react";
import type { ReactNode } from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SidebarNav from "../components/SidebarNav"; // adjust if your SidebarNav path differs
import ThemeBoot from "../components/ThemeBoot";
import ApplyTheme from "@/app/components/ApplyTheme";


export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?from=/dashboard");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
     <ApplyTheme />
      <ThemeBoot />
      <SidebarNav />
      <main
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
    </div>
  );
}