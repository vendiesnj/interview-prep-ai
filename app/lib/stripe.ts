// app/lib/stripe.ts
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment variables");
}

// Export a single shared Stripe client
export const stripe = new Stripe(key);