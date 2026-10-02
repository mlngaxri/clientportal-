import { z } from "zod";
import { ownedProject, admin, failure } from "../../../../../lib/server";
import { stripe } from "../../../../../lib/stripe";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await ownedProject(id);
    const key = z.uuid().parse(new URL(req.url).searchParams.get("checkout"));
    const service = admin();
    const { data: intent, error } = await service.from("checkout_intents").select("session_id,subscription_id,kind").eq("project_id", id).eq("key", key).maybeSingle();
    if (error) throw error;
    if (!intent?.session_id) return Response.json({ state: "unknown" }, { headers: { "Cache-Control": "private, no-store" } });
    const result = intent.kind === "pro"
      ? await service.from("subscriptions").select("status").eq("project_id", id).eq("id", intent.subscription_id || "").maybeSingle()
      : await service.from("payments").select("id").eq("project_id", id).eq("id", intent.session_id).maybeSingle();
    if (result.error) throw result.error;
    if (result.data && (intent.kind !== "pro" || ("status" in result.data && result.data.status === "active"))) return Response.json({ state: "confirmed" }, { headers: { "Cache-Control": "private, no-store" } });
    const session = await stripe().checkout.sessions.retrieve(intent.session_id);
    return Response.json({ state: session.status === "expired" && session.payment_status !== "paid" ? "expired" : "processing" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
