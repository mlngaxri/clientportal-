import { stripe } from "../../../../lib/stripe";
import { admin } from "../../../../lib/server";
import type Stripe from "stripe";
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET)
    return Response.json({ error: "Webhook not configured" }, { status: 400 });
  let event: Stripe.Event;
  let s: Stripe;
  try {
    s = stripe();
    event = s.webhooks.constructEvent(
      await req.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    const db = admin();
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ].includes(event.type)
    ) {
      const session = await s.checkout.sessions.retrieve(
        (event.data.object as Stripe.Checkout.Session).id,
      );
      if (session.payment_status === "paid" && session.mode === "payment") {
        const bound = await db.rpc("bind_checkout", { pid: session.metadata?.projectId, payment_kind: session.metadata?.kind, reservation_key: session.metadata?.reservationKey, session_id: session.id });
        if (bound.error) throw bound.error;
        const { error } = await db.rpc("record_payment", {
          event_id: event.id,
          session_id: session.id,
          pid: session.metadata?.projectId,
          payment_kind: session.metadata?.kind,
          amount: session.amount_total,
          currency_code: session.currency,
        });
        if (error) throw error;
      }
    }
    if (
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(event.type)
    ) {
      const incoming = event.data.object as Stripe.Subscription;
      const current = await s.subscriptions.retrieve(incoming.id);
      const prior = await db.from("subscriptions").select("project_id").eq("id", current.id).maybeSingle();
      if (prior.error) throw prior.error;
      if (!prior.data) {
        const sessions = await s.checkout.sessions.list({ subscription: current.id, limit: 2 });
        const session = sessions.data.find((item) => item.status === "complete" && item.metadata?.kind === "pro" && item.metadata?.projectId === current.metadata.projectId);
        if (!session) throw new Error("Subscription checkout not confirmed");
        const bound = await db.rpc("bind_checkout", { pid: current.metadata.projectId, payment_kind: "pro", reservation_key: session.metadata?.reservationKey, session_id: session.id, subscription_id: current.id });
        if (bound.error) throw bound.error;
      }
      if (current.items.data.length !== 1 || current.items.data[0].quantity !== 1 || current.items.data[0].price.currency !== "aud" || current.items.data[0].price.unit_amount !== 3900 || current.items.data[0].price.recurring?.interval !== "month" || current.items.data[0].price.recurring?.interval_count !== 1) throw new Error("Subscription price mismatch");
      const { error } = await db.rpc("record_subscription", {
        sid: current.id,
        pid: current.metadata.projectId,
        new_status: current.status,
        event_time: event.created,
      });
      if (error) throw error;
    }
    return Response.json({ received: true });
  } catch {
    return Response.json(
      { error: "Reconciliation failed; Stripe should retry." },
      { status: 500 },
    );
  }
}
