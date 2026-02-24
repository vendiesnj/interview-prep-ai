// app/lib/entitlements.ts
import { prisma } from "@/app/lib/prisma";

export type AttemptEntitlement =
  | { allowed: true; isPro: true; cap: null; used: number; remaining: null }
  | { allowed: true; isPro: false; cap: number; used: number; remaining: number }
  | {
      allowed: false;
      isPro: false;
      cap: number;
      used: number;
      remaining: 0;
      reason: "FREE_LIMIT_REACHED" | "NOT_AUTHENTICATED";
    };

export async function getAttemptEntitlement(userId?: string | null): Promise<AttemptEntitlement> {
  if (!userId) {
   return { allowed: false, isPro: false, cap: 3, used: 0, remaining: 0, reason: "NOT_AUTHENTICATED" }; 
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, freeAttemptCap: true },
  });

  // Match your existing logic in app/api/entitlement/route.ts
  const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";
  if (isPro) {
   return { allowed: true, isPro: true, cap: null, used: 0, remaining: null }; 
  }

  const cap = user?.freeAttemptCap ?? 3;

  const used = await prisma.attempt.count({
    where: { userId, deletedAt: null },
  });

  const remaining = Math.max(0, cap - used);

  if (remaining <= 0) {
    return { allowed: false, isPro: false, cap, used, remaining: 0, reason: "FREE_LIMIT_REACHED" };
  }

  return { allowed: true, isPro: false, cap, used, remaining };
}