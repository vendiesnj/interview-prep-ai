import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import UpgradeButton from "@/app/components/UpgradeButton";
import ManageBillingButton from "@/app/components/ManageBillingButton";
import DangerZoneDeleteAccount from "@/app/components/DangerZoneDeleteAccount";
import BillingSyncOnReturn from "@/app/components/BillingSyncOnReturn";
import PremiumShell from "../../components/PremiumShell";
import { Suspense } from "react";

function label(v?: string | null) {
  return v && v.trim().length ? v : "—";
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

  const now = new Date();

  const isPro =
  user.subscriptionStatus === "active" ||
  user.subscriptionStatus === "trialing";

    return (
    <PremiumShell
      title="Account"
      subtitle="Manage your profile, sign-in methods, and subscription."
    >
      <div style={{ maxWidth: 900 }}>
        {/* BillingSyncOnReturn uses useSearchParams(), which requires a Suspense boundary */}
<Suspense fallback={null}>
  <BillingSyncOnReturn />
</Suspense>

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          {/* Profile */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ fontWeight: 900, color: "#E5E7EB", marginBottom: 10 }}>
              Profile
            </div>

            <div style={{ display: "grid", gap: 8, color: "#E5E7EB" }}>
              <div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>Name</div>
                <div style={{ fontWeight: 800 }}>{label(user.name)}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>Email</div>
                <div style={{ fontWeight: 800 }}>{label(user.email)}</div>
              </div>
            </div>
          </div>

          {/* Sign-in methods */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ fontWeight: 900, color: "#E5E7EB", marginBottom: 10 }}>
              Sign-in methods
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ color: "#E5E7EB", fontWeight: 800 }}>Google</div>
                <div style={{ color: hasGoogle ? "#A5F3FC" : "#9CA3AF", fontWeight: 900 }}>
                  {hasGoogle ? "Connected" : "Not connected"}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ color: "#E5E7EB", fontWeight: 800 }}>Password</div>
                <div style={{ color: hasPassword ? "#A5F3FC" : "#9CA3AF", fontWeight: 900 }}>
                  {hasPassword ? "Set" : "Not set"}
                </div>
              </div>

              <div style={{ marginTop: 10, color: "#9CA3AF", fontSize: 12 }}>
                Password changes + linking providers can come next.
              </div>
            </div>
          </div>

          {/* Plan */}
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ fontWeight: 900, color: "#E5E7EB", marginBottom: 10 }}>
              Plan
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ color: "#E5E7EB", fontWeight: 800 }}>Status</div>
                <div style={{ color: "#A5F3FC", fontWeight: 900 }}>
                  {user.subscriptionStatus ?? "free"}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ color: "#E5E7EB", fontWeight: 800 }}>Renewal</div>
                <div style={{ color: "#9CA3AF", fontWeight: 900 }}>
                  {user.currentPeriodEnd ? user.currentPeriodEnd.toLocaleDateString() : "—"}
                </div>
              </div>

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
          </div>

          <DangerZoneDeleteAccount />
        </div>
      </div>
    </PremiumShell>
  );
}