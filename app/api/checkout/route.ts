import { assertCheckoutEnabled } from "../../../lib/release";
import { ownedProject, checkOrigin, failure, admin } from "../../../lib/server";
import { stripe } from "../../../lib/stripe";
import { z } from "zod";
import { prices } from "../../../lib/model";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { projectId, kind } = z.object({ projectId: z.uuid(), kind: z.enum(["initial", "final", "revision", "pro"]) }).parse(await req.json());
    const { project, client } = await ownedProject(projectId);
    assertCheckoutEnabled({ package: project.package, kind }, process.env);
    const eligible = (kind === "initial" && project.phase === "AWAITING_INITIAL_PAYMENT") || (kind === "final" && project.phase === "APPROVED_AWAITING_FINAL_PAYMENT") || (kind === "revision" && project.phase === "REVIEW" && project.revision_used >= project.revision_limit) || (kind === "pro" && project.phase === "LIVE" && !project.pro);
    if (!eligible) throw new Error("This payment is not available at the current project stage.");
    const configuredBase = process.env.APP_URL;
    let returnAddress: URL;
    try { returnAddress = new URL(configuredBase || ""); } catch { throw new Error("Payment return address is not configured."); }
    if (!["https:", "http:"].includes(returnAddress.protocol) || (process.env.APP_ENV !== "development" && returnAddress.protocol !== "https:") || returnAddress.username !== "" || returnAddress.password !== "" || returnAddress.pathname !== "/" || returnAddress.search !== "" || returnAddress.hash !== "") throw new Error("Payment return address is not configured.");
    const base = returnAddress.origin;
    const s = stripe();
    let reservation = await client.rpc("reserve_checkout", { pid: projectId, payment_kind: kind });
    if (reservation.error) throw new Error(reservation.error.message);
    let intent = reservation.data;
    let rotate = !intent.session_id && Date.parse(intent.expires_at) - Date.now() < 31 * 60000;
    if (intent.session_id) {
      const existing = await s.checkout.sessions.retrieve(intent.session_id);
      if (existing.status === "open" && existing.url) return Response.json({ url: existing.url });
      if (existing.status === "complete") {
        if (kind === "revision") {
          const receipt = await admin().from("payments").select("id").eq("id", existing.id).eq("project_id", projectId).eq("kind", "revision").maybeSingle();
          if (receipt.error) throw receipt.error;
          rotate = !!receipt.data;
        } else if (kind === "pro" && existing.subscription) {
          const subscription = await s.subscriptions.retrieve(typeof existing.subscription === "string" ? existing.subscription : existing.subscription.id);
          rotate = ["canceled", "incomplete_expired"].includes(subscription.status);
          if (!rotate && ["past_due", "unpaid", "incomplete", "paused"].includes(subscription.status)) throw new Error("Pro billing needs attention. Open Billing and manage your existing subscription.");
        }
        if (!rotate) throw new Error("Payment is being confirmed. Refresh your project shortly.");
      } else rotate = true;
    }
    if (rotate) {
      const rotation = await admin().rpc("rotate_checkout", { pid: projectId, payment_kind: kind, old_key: intent.key });
      if (rotation.error) throw rotation.error;
      reservation = await client.rpc("reserve_checkout", { pid: projectId, payment_kind: kind });
      if (reservation.error) throw reservation.error;
      intent = reservation.data;
      if (intent.session_id) {
        const existing = await s.checkout.sessions.retrieve(intent.session_id);
        if (existing.status === "open" && existing.url) return Response.json({ url: existing.url });
        throw new Error("Payment is being confirmed. Refresh your project shortly.");
      }
    }
    const amount = kind === "initial" ? project.package === "FIRST" ? prices.first : prices.initial : prices[kind as keyof typeof prices];
    // A locked database reservation keeps simultaneous checkout requests on one Stripe session.
    const session = await s.checkout.sessions.create({
      mode: kind === "pro" ? "subscription" : "payment",
      client_reference_id: projectId,
      metadata: { projectId, kind, reservationKey: intent.key },
      ...(kind === "pro" ? { subscription_data: { metadata: { projectId } } } : {}),
      line_items: [{ price_data: { currency: "aud", unit_amount: amount, product_data: { name: `Fourthform ${kind === "pro" ? "Pro" : kind === "final" ? "Site remaining balance" : kind === "revision" ? "additional revision" : "website start"}` }, ...(kind === "pro" ? { recurring: { interval: "month" as const } } : {}) }, quantity: 1 }],
      success_url: `${base}${kind === "initial" ? `/start?project=${projectId}&` : `/projects/${projectId}/overview?`}payment=processing&checkout=${intent.key}`,
      cancel_url: `${base}${kind === "initial" ? `/start?project=${projectId}&` : `/projects/${projectId}/overview?`}payment=cancelled`,
      expires_at: Math.floor(new Date(intent.expires_at).getTime() / 1000),
    }, { idempotencyKey: intent.key });
    const stored = await admin().rpc("bind_checkout", { pid: projectId, payment_kind: kind, reservation_key: intent.key, session_id: session.id });
    if (stored.error) throw stored.error;
    if (!session.url) throw new Error("Checkout provider did not return a redirect URL.");
    return Response.json({ url: session.url });
  } catch (e) { return failure(e); }
}
