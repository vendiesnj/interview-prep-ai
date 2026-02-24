// app/api/billing/sync/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const userAgent = req.headers.get("user-agent") ?? null;

  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, stripeCustomerId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "MISSING_SESSION_ID" }, { status: 400 });
    }

    // Pull the Checkout Session (expand subscription for subscription mode)
    const cs = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "subscription.items.data.price"],
    });

    const csUserId =
      (cs.client_reference_id as string | null) ??
      ((cs.metadata?.userId as string | undefined) ?? null);

    // Prevent someone from syncing someone else's checkout session
    if (!csUserId || csUserId !== user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const customerId = (cs.customer as string | null) ?? null;

    // Update entitlement based on mode
    if (cs.mode === "subscription") {
      const sub = cs.subscription as any | null;

      if (!sub) {
        return NextResponse.json({ error: "MISSING_SUBSCRIPTION" }, { status: 400 });
      }

      const status = (sub.status as string) ?? "unknown";
      const subscriptionId = (sub.id as string) ?? null;

      const priceId =
        sub.items?.data?.[0]?.price?.id ??
        null;

      const currentPeriodEnd =
        typeof sub.current_period_end === "number"
          ? new Date(sub.current_period_end * 1000)
          : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: status,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          currentPeriodEnd,
          ...(customerId ? { stripeCustomerId: customerId } : {}),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "billing.sync_subscription",
          ip,
          userAgent,
          meta: { sessionId, status, subscriptionId, priceId, customerId },
        },
      });

      return NextResponse.json({ ok: true, mode: "subscription", status }, { status: 200 });
    }

    // One-time payment mode (if you use it later)
    const paid = (cs.payment_status as string | null) === "paid";

    if (paid) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: "active",
          ...(customerId ? { stripeCustomerId: customerId } : {}),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "billing.sync_payment",
        ip,
        userAgent,
        meta: { sessionId, paid, customerId },
      },
    });

    return NextResponse.json({ ok: true, mode: "payment", paid }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "SYNC_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}