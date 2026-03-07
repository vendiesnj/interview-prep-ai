import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import UpgradeButton from "@/app/components/UpgradeButton";
import ManageBillingButton from "@/app/components/ManageBillingButton";
import DangerZoneDeleteAccount from "@/app/components/DangerZoneDeleteAccount";
import BillingSyncOnReturn from "@/app/components/BillingSyncOnReturn";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import { Suspense } from "react";
import Link from "next/link";

function label(v?: string | null) {
  return v && v.trim().length ? v : "—";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 900,
        color: "var(--text-primary)",
        marginBottom: 12,
        fontSize: 15,
        letterSpacing: -0.1,
      }}
    >
      {children}
    </div>
  );
}

function FieldRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <div style={{ color: "var(--text-primary)", fontWeight: 800 }}>{label}</div>
      <div
        style={{
          color: valueColor ?? "var(--text-muted)",
          fontWeight: 900,
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const email = session.user.email;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      passwordHash: true,
      subscriptionStatus: true,
      stripePriceId: true,
      currentPeriodEnd: true,
      accounts: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  type AccountRow = (typeof user.accounts)[number];

  const hasGoogle = user.accounts.some((a: AccountRow) => a.provider === "google");
  const hasPassword = Boolean(user.passwordHash);

  const isPro =
    user.subscriptionStatus === "active" ||
    user.subscriptionStatus === "trialing";

  return (
    <PremiumShell
      title="Account"
      subtitle="Manage your profile, sign-in methods, and subscription."
    >
      <div style={{ maxWidth: 900 }}>
        <Suspense fallback={null}>
          <BillingSyncOnReturn />
        </Suspense>

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <PremiumCard
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
            }}
          >
            <SectionTitle>Profile</SectionTitle>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  Name
                </div>
                <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                  {label(user.name)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  Email
                </div>
                <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                  {label(user.email)}
                </div>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
            }}
          >
            <SectionTitle>Sign-in methods</SectionTitle>

            <div style={{ display: "grid", gap: 10 }}>
              <FieldRow
                label="Google"
                value={hasGoogle ? "Connected" : "Not connected"}
                valueColor={hasGoogle ? "var(--accent)" : "var(--text-muted)"}
              />

              <FieldRow
                label="Password"
                value={hasPassword ? "Set" : "Not set"}
                valueColor={hasPassword ? "var(--accent)" : "var(--text-muted)"}
              />

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {!hasPassword ? (
                  <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5 }}>
                    No password is set yet. If you signed up with Google, you can set one to enable email login.
                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5 }}>
                    Password is set. You can sign in with email + password.
                  </div>
                )}

                {hasGoogle && !hasPassword ? (
                  <Link
                    href="/set-password"
                    style={{
                      marginLeft: "auto",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--accent-strong)",
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      fontWeight: 900,
                      textDecoration: "none",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Set password
                  </Link>
                ) : null}
              </div>
            </div>
          </PremiumCard>

          <PremiumCard
            style={{
              padding: 16,
              borderRadius: "var(--radius-md)",
            }}
          >
            <SectionTitle>Plan</SectionTitle>

            <div style={{ display: "grid", gap: 10 }}>
              <FieldRow
                label="Status"
                value={user.subscriptionStatus ?? "free"}
                valueColor="var(--accent)"
              />

              <FieldRow
                label="Renewal"
                value={user.currentPeriodEnd ? user.currentPeriodEnd.toLocaleDateString() : "—"}
                valueColor="var(--text-muted)"
              />

              {isPro ? (
                <div style={{ marginTop: 12 }}>
                  <ManageBillingButton />
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <UpgradeButton mode="subscription" label="Upgrade to Pro" />
                </div>
              )}
            </div>
          </PremiumCard>

          <DangerZoneDeleteAccount />
        </div>
      </div>
    </PremiumShell>
  );
}