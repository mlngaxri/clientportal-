import { ownedProject, failure } from "../../../../../lib/server";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client } = await ownedProject(id);
    const [payments, subscriptions] = await Promise.all([
      client
        .from("payments")
        .select("id,kind,amount,currency,paid_at")
        .eq("project_id", id)
        .order("paid_at", { ascending: false }),
      client
        .from("subscriptions")
        .select("id,status,event_created")
        .eq("project_id", id)
        .order("event_created", { ascending: false }),
    ]);
    if (payments.error) throw payments.error;
    if (subscriptions.error) throw subscriptions.error;
    return Response.json({
      payments: payments.data || [],
      subscriptions: subscriptions.data || [],
    });
  } catch (e) {
    return failure(e);
  }
}
