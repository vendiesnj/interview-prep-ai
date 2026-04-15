import React from "react";
import type { ReactNode } from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import TopNav from "../components/TopNav";
import OnboardingOverlay from "../components/OnboardingOverlay";
import UserStorageGuard from "../components/UserStorageGuard";
import SupportChat from "../components/SupportChat";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?from=/dashboard");

  const isAdmin = (session?.user as any)?.tenantRole === "tenant_admin";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopNav />
      <main
        className="ipc-main-content"
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          padding: "24px 20px 80px",
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
      {!isAdmin && <OnboardingOverlay />}
      <UserStorageGuard />
      <SupportChat />
    </div>
  );
}
