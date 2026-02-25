// app/api/billing/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/app/lib/prisma";
import { makePosthogServer } from "@/app/lib/posthog-server";

export const runtime = "nodejs";

// Keep constructor simple to avoid TS "apiVersion" underlines in some setups
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function toDateFromSeconds(sec: unknown): Date | null {
  return typeof sec === "number" ? new Date(sec * 1000) : null;
}

async function updateUserByCustomerOrSub(input: {
  customerId: string | null;
  subscriptionId: string | null;
  status?: string | null;
  priceId?: string | null;
  currentPeriodEnd?: Date | null;
}) {
  const { customerId, subscriptionId, status, priceId, currentPeriodEnd } = input;

  if (!customerId && !subscriptionId) return { count: 0 };

  return prisma.user.updateMany({
    where: {
      OR: [
        ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : []),
        ...(customerId ? [{ stripeCustomerId: customerId }] : []),
      ],
    },
    data: {
  ...(status ? { subscriptionStatus: status } : {}),
  ...(customerId ? { stripeCustomerId: customerId } : {}),
  ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
  ...(priceId ? { stripePriceId: priceId } : {}),

  // Only touch currentPeriodEnd if the caller provided it.
  ...(typeof currentPeriodEnd !== "undefined" ? { currentPeriodEnd } : {}),

    },
  });
}

export async function POST(req: Request) {
  console.warn("WEBHOOK_HIT", {
  ts: new Date().toISOString(),
  path: "/api/billing/webhook",
  ua: req.headers.get("user-agent"),
});
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  const rawBody = await req.text();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const userAgent = req.headers.get("user-agent") ?? null;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret) as Stripe.Event;
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err?.message ?? "unknown"}` },
      { status: 400 }
    );
  }
  console.warn("WEBHOOK_EVENT", {
  id: event.id,
  type: event.type,
});

  const allowedTypes = new Set([
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
  ]);

  if (!allowedTypes.has(event.type)) {
    await prisma.auditLog
      .create({
        data: {
          action: "billing.webhook_ignored",
          ip,
          userAgent,
          meta: { eventId: event.id, type: event.type },
        },
      })
      .catch(() => {});


    const res = NextResponse.json({ received: true }, { status: 200 });
res.headers.set("x-ipc-webhook", "ok");
return res;
  }

  const eventId = event.id;

  try {
    // ---- idempotency ----
    const already = await prisma.stripeEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (already) {
      await prisma.auditLog
        .create({
          data: {
            action: "billing.webhook_duplicate",
            ip,
            userAgent,
            meta: { eventId, type: event.type },
          },
        })
        .catch(() => {});
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    await prisma.stripeEvent.create({ data: { id: eventId } });

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const cs = event.data.object as any;

          const customerId = (cs.customer as string | null) ?? null;
          const userId =
            (cs.client_reference_id as string | null) ??
            ((cs.metadata?.userId as string | undefined) ?? null);

          const subscriptionId = (cs.subscription as string | null) ?? null;

          // Just record mapping quickly. Period end will be set by invoice events (most reliable).
          if (userId) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                subscriptionStatus: "active",
                ...(customerId ? { stripeCustomerId: customerId } : {}),
                ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
              },
            });
          } else if (customerId) {
            await prisma.user.updateMany({
              where: { stripeCustomerId: customerId },
              data: {
                subscriptionStatus: "active",
                ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
              },
            });
          }

          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object as any;

          const subscriptionId = (sub.id as string | null) ?? null;
          const customerId = (sub.customer as string | null) ?? null;
          const status = (sub.status as string | null) ?? "unknown";

          // Try to read price quickly (ok if null)
          const priceId =
            sub?.items?.data?.[0]?.price?.id ??
            null;

          // If Stripe gives you current_period_end, great. If not, invoice handler will set it.
          const currentPeriodEnd = toDateFromSeconds(sub?.current_period_end);

          await updateUserByCustomerOrSub({
            customerId,
            subscriptionId,
            status,
            priceId,
            currentPeriodEnd,
          });

          break;
        }

        case "invoice.payment_failed": {
          const inv = event.data.object as any;
          const invoiceId = (inv.id as string | null) ?? null;

          // Retrieve full invoice so we ALWAYS have customer/subscription
          const full = invoiceId
            ? await stripe.invoices.retrieve(invoiceId, { expand: ["lines.data.price"] })
            : null;

          const customerId = ((full as any)?.customer as string | null) ?? ((inv.customer as string | null) ?? null);
          const subscriptionId =
            ((full as any)?.subscription as string | null) ??
            ((inv.subscription as string | null) ?? null);

          await updateUserByCustomerOrSub({
            customerId,
            subscriptionId,
            status: "past_due",
          });

          await prisma.auditLog
            .create({
              data: {
                action: "billing.invoice_payment_failed",
                ip,
                userAgent,
                meta: { eventId, invoiceId, customerId, subscriptionId },
              },
            })
            .catch(() => {});
          break;
        }

        case "invoice.paid":
        case "invoice.payment_succeeded": {
          const inv = event.data.object as any;
          const invoiceId = (inv.id as string | null) ?? null;

          // THIS is the key: pull full invoice with expanded lines (period.end is the truth)
          const full = invoiceId
            ? await stripe.invoices.retrieve(invoiceId, { expand: ["lines.data.price"] })
            : null;

          const customerId =
            ((full as any)?.customer as string | null) ??
            ((inv.customer as string | null) ?? null);

          const subscriptionId =
            ((full as any)?.subscription as string | null) ??
            ((inv.subscription as string | null) ?? null);

          // Use invoice lines to determine current period end.
// IMPORTANT: lines.data[0] is often NOT the subscription line (could be tax/proration).
const lines = ((full as any)?.lines?.data ?? []) as any[];

// pick the first line that actually has a period end
const lineWithPeriod =
  lines.find((l) => typeof l?.period?.end === "number") ?? null;

let periodEndSec: number | null =
  typeof lineWithPeriod?.period?.end === "number" ? lineWithPeriod.period.end : null;

let currentPeriodEnd: Date | null =
  periodEndSec ? new Date(periodEndSec * 1000) : null;

// Fallback: if invoice line period isn't present, fetch subscription.current_period_end
if (!currentPeriodEnd && subscriptionId) {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const sec = (sub as any)?.current_period_end;
    if (typeof sec === "number") {
      periodEndSec = sec;
      currentPeriodEnd = new Date(sec * 1000);
    }
  } catch {
    // don't crash webhook; leave null
  }
}

const priceId: string | null =
  lineWithPeriod?.price?.id ??
  lineWithPeriod?.plan?.id ?? // older objects
  null;
          const result = await updateUserByCustomerOrSub({
            customerId,
            subscriptionId,
            status: "active",
            priceId,
            currentPeriodEnd,
          });

          console.warn("INVOICE->DB_UPDATE", JSON.stringify({
  matched: result.count,
  invoiceId,
  customerId,
  subscriptionId,
  priceId,
  periodEndSec,
  currentPeriodEndISO: currentPeriodEnd?.toISOString?.() ?? null,
}));

          const ph = makePosthogServer();

// Only record if we actually matched a user row (prevents noise)
if (result.count > 0) {
  const u = customerId
    ? await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
        select: { email: true },
      })
    : null;

  ph?.capture({
    // Use the same distinctId as the browser identify (email)
    distinctId: u?.email ?? customerId ?? subscriptionId ?? eventId,
    event: "subscription_active",
    properties: {
      invoiceId,
      customerId,
      subscriptionId,
      priceId,
      currentPeriodEnd: currentPeriodEnd?.toISOString?.() ?? null,
      stripeEventType: event.type,
      matchedUsers: result.count,
    },
  });

  await ph?.shutdown();
}

          break;
        }

        default:
          break;
      }
    } catch (err) {
      // Remove idempotency marker so Stripe retries can succeed
      await prisma.stripeEvent.delete({ where: { id: eventId } }).catch(() => {});
      throw err;
    }

    await prisma.auditLog
      .create({
        data: {
          action: "billing.webhook_processed",
          ip,
          userAgent,
          meta: { eventId, type: event.type },
        },
      })
      .catch(() => {});

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    await prisma.auditLog
      .create({
        data: {
          action: "billing.webhook_error",
          ip,
          userAgent,
          meta: {
            type: event?.type ?? null,
            eventId: event?.id ?? null,
            message: err?.message ?? "unknown",
          },
        },
      })
      .catch(() => {});

    return NextResponse.json(
      { error: `Webhook handler failed: ${err?.message ?? "unknown"}` },
      { status: 500 }
    );
  }
}