// app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";
import { makePosthogServer } from "@/app/lib/posthog-server";

export const runtime = "nodejs";

type Body = {
  // "subscription" for recurring, "payment" for one-time
  mode?: "subscription" | "payment";
};



export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const mode: "subscription" | "payment" = body.mode ?? "subscription";

    // You will set these in .env (see below)
    const priceId =
      mode === "subscription"
        ? process.env.STRIPE_PRICE_ID_SUB
        : process.env.STRIPE_PRICE_ID_ONETIME;

    if (!priceId) {
      return NextResponse.json(
        { error: "MISSING_PRICE_ID", message: "Stripe price id not configured." },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true, // must exist in your User model
      },
    });

    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Ensure Stripe customer exists
    let customerId = user.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });

      customerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const checkout = await stripe.checkout.sessions.create({
  mode, // "subscription" or "payment"
  customer: customerId,

  // Critical for matching Stripe objects back to your app user
  client_reference_id: user.id,
  metadata: {
    userId: user.id,
    plan: "pro",
    mode,
  },

  // For subscription mode, ensure metadata is also on the Subscription object
  ...(mode === "subscription"
    ? {
        subscription_data: {
          metadata: {
            userId: user.id,
            plan: "pro",
          },
        },
      }
    : {}),

  line_items: [{ price: priceId, quantity: 1 }],
  allow_promotion_codes: true,

  // Include session id so we can “sync” entitlement on return (if webhook is delayed)
  success_url: `${appUrl}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${appUrl}/account?checkout=cancel`,
});


const ph = makePosthogServer();
ph?.capture({
  distinctId: user.id, // best distinct id for funnels
  event: "checkout_started",
  properties: {
    checkoutSessionId: checkout.id,
    priceId: priceId ?? null,
    mode: mode ?? "subscription",
  },
});

    return NextResponse.json({ url: checkout.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "CHECKOUT_ERROR", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}