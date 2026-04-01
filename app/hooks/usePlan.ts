"use client";

import { useSession } from "next-auth/react";

export type Plan = "consumer" | "university";

/**
 * Returns the current user's plan.
 * - Users with a tenant use the tenant's plan field.
 * - Users with no tenant (standalone signups) are "consumer".
 */
export function usePlan(): Plan {
  const { data: session } = useSession();
  const tenantPlan = (session as any)?.tenant?.plan as string | undefined;
  if (!tenantPlan) return "consumer";
  return tenantPlan === "consumer" ? "consumer" : "university";
}

export function useIsUniversity(): boolean {
  return usePlan() === "university";
}

export function useIsConsumer(): boolean {
  return usePlan() === "consumer";
}
