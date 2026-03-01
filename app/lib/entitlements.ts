// app/lib/entitlements.ts
import { prisma } from "@/app/lib/prisma";

export type AttemptEntitlement = {
  allowed: boolean;
  isPro: boolean;
  cap: number | null;
  used: number;
  remaining: number | null;
  reason?: "FREE_CAP" | "PRO";
};

export async function getAttemptEntitlement(userId: string): Promise<AttemptEntitlement> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      currentPeriodEnd: true,
      freeAttemptCap: true,
    },
  });

  const cap = user?.freeAttemptCap ?? 3;
  const status = user?.subscriptionStatus ?? null;

  const now = Date.now();
  const periodEndMs =
    user?.currentPeriodEnd instanceof Date ? user.currentPeriodEnd.getTime() : null;

  // Launch-safe definition of "Pro access":
  // - active/trialing always Pro
  // - if Stripe says canceled/past_due/unpaid/etc but currentPeriodEnd is still in the future,
  //   user still has paid time remaining → treat as Pro until that time ends.
  const hasPaidTimeRemaining = periodEndMs ? periodEndMs > now : false;

  const isPro =
    status === "active" ||
    status === "trialing" ||
    hasPaidTimeRemaining;

  if (isPro) {
    return {
      allowed: true,
      isPro: true,
      cap: null,
      used: 0,
      remaining: null,
      reason: "PRO",
    };
  }

  const used = await prisma.attempt.count({
    where: { userId, deletedAt: null },
  });

  const remaining = Math.max(0, cap - used);

  return {
    allowed: remaining > 0,
    isPro: false,
    cap,
    used,
    remaining,
    reason: remaining > 0 ? undefined : "FREE_CAP",
  };
}