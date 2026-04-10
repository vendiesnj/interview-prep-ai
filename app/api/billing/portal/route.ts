// app/api/billing/portal/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "NO_CUSTOMER", message: "No Stripe customer found for this user." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    let portalUrl: string;
    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${appUrl}/settings`,
      });
      portalUrl = portal.url;
    } catch (stripeErr: any) {
      if (stripeErr?.code === "resource_missing") {
        // Stale customer ID (e.g. key rotated or test→live switch) — clear it
        await prisma.user.update({
          where: { email },
          data: { stripeCustomerId: null },
        });
        return NextResponse.json(
          { error: "STALE_CUSTOMER", message: "Billing session expired. Please use Upgrade to re-link your account." },
          { status: 400 }
        );
      }
      throw stripeErr;
    }

    return NextResponse.json({ url: portalUrl }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "PORTAL_ERROR", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}