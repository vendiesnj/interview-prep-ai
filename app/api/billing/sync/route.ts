// app/api/billing/sync/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";

function toDateFromSeconds(sec: unknown): Date | null {
  return typeof sec === "number" ? new Date(sec * 1000) : null;
}

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
      select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    // ---------------------------------------------
    // PATH A: session_id provided (your current secure flow)
    // ---------------------------------------------
    if (sessionId) {
      const cs = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "subscription.items.data.price"],
      });

      const csUserId =
        (cs.client_reference_id as string | null) ??
        ((cs.metadata?.userId as string | undefined) ?? null);

      // Prevent syncing someone else's checkout session
      if (!csUserId || csUserId !== user.id) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }

      const customerId = (cs.customer as string | null) ?? null;

      if (cs.mode === "subscription") {
        const sub = cs.subscription as any | null;
        if (!sub) {
          return NextResponse.json({ error: "MISSING_SUBSCRIPTION" }, { status: 400 });
        }

        const status = (sub.status as string) ?? "unknown";
        const subscriptionId = (sub.id as string) ?? null;

        const priceId = sub.items?.data?.[0]?.price?.id ?? null;

        const currentPeriodEnd = toDateFromSeconds(sub.current_period_end);

        const cancelAtPeriodEnd =
          typeof sub.cancel_at_period_end === "boolean" ? sub.cancel_at_period_end : null;

        const canceledAt = toDateFromSeconds(sub.canceled_at);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionStatus: status,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            currentPeriodEnd,
            ...(customerId ? { stripeCustomerId: customerId } : {}),
            ...(cancelAtPeriodEnd !== null ? { cancelAtPeriodEnd } : {}),
            ...(typeof canceledAt !== "undefined" ? { canceledAt } : {}),
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "billing.sync_subscription",
            ip,
            userAgent,
            meta: { sessionId, status, subscriptionId, priceId, customerId, cancelAtPeriodEnd },
          },
        });

        return NextResponse.json(
          { ok: true, mode: "subscription", status, cancelAtPeriodEnd },
          { status: 200 }
        );
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
    }

    // ---------------------------------------------
    // PATH B: NO session_id → sync from Stripe using customer/subscription
    // (launch-day support escape hatch)
    // ---------------------------------------------

    // Ensure we have a customer id. If not, try to find it by email.
    let customerId: string | null = user.stripeCustomerId ?? null;

    if (!customerId) {
      const customers = await stripe.customers.list({
  email: user.email ?? undefined,
  limit: 1,
});
      customerId = (customers.data?.[0]?.id as string | undefined) ?? null;

      if (customerId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { ok: true, synced: false, error: "NO_STRIPE_CUSTOMER" },
        { status: 200 }
      );
    }

    // Find latest subscription for this customer
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
      expand: ["data.items.data.price"],
    });

    const sorted = [...subs.data].sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
    const sub = sorted[0] ?? null;

    if (!sub) {
      return NextResponse.json(
        { ok: true, synced: false, error: "NO_SUBSCRIPTION_FOUND", customerId },
        { status: 200 }
      );
    }

    const status = (sub.status as string) ?? "unknown";
    const subscriptionId = sub.id ?? null;
    const priceId = (sub.items?.data?.[0]?.price as any)?.id ?? null;
    const currentPeriodEnd = toDateFromSeconds((sub as any)?.current_period_end);

    const cancelAtPeriodEnd =
      typeof (sub as any)?.cancel_at_period_end === "boolean"
        ? (sub as any).cancel_at_period_end
        : null;

    const canceledAt = toDateFromSeconds((sub as any)?.canceled_at);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: status,
        stripePriceId: priceId,
        currentPeriodEnd,
        ...(cancelAtPeriodEnd !== null ? { cancelAtPeriodEnd } : {}),
        ...(typeof canceledAt !== "undefined" ? { canceledAt } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "billing.sync_fallback",
        ip,
        userAgent,
        meta: { status, subscriptionId, priceId, customerId, cancelAtPeriodEnd },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        synced: true,
        mode: "fallback",
        status,
        customerId,
        subscriptionId,
        currentPeriodEnd: currentPeriodEnd?.toISOString?.() ?? null,
        cancelAtPeriodEnd,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "SYNC_FAILED",
        message:
          process.env.NODE_ENV === "production"
            ? "INTERNAL_ERROR"
            : (err?.message ?? "Unknown error"),
      },
      { status: 500 }
    );
  }
}