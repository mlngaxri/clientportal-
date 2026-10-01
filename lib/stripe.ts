import "server-only";
import Stripe from "stripe";
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error(
      "Payments are not configured yet. No payment has been taken.",
    );
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
