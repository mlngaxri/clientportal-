import { verifyEmailWebhook } from "../../../../lib/services/webhook";
import { admin } from "../../../../lib/server";
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 100000) return new Response(null, { status: 413 });
  let id: string, event: any;
  try {
    id = verifyEmailWebhook(
      body,
      req.headers,
      process.env.RESEND_WEBHOOK_SECRET || "",
    );
    event = JSON.parse(body);
  } catch {
    return Response.json(
      { error: "Invalid webhook signature or body." },
      { status: 400 },
    );
  }
  const status = String(event.type || "").replace(/^email\./, "");
  if (
    !["delivered", "bounced", "complained", "suppressed", "failed"].includes(
      status,
    )
  )
    return Response.json({ received: true });
  if (
    typeof event.data?.email_id !== "string" ||
    !Number.isFinite(Date.parse(event.created_at))
  )
    return Response.json(
      { error: "Invalid delivery receipt." },
      { status: 400 },
    );
  try {
    const { error } = await admin().rpc("record_email_event", {
      event_id: id,
      email_id: event.data.email_id,
      new_status: status,
      event_time: event.created_at,
    });
    if (error) throw error;
    return Response.json({ received: true });
  } catch {
    return Response.json(
      { error: "Receipt could not be recorded. The provider should retry." },
      { status: 503 },
    );
  }
}
