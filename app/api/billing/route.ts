import { checkOrigin, ownedProject, failure } from "../../../lib/server";
import { stripe } from "../../../lib/stripe";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { projectId } = await req.json();
    if (typeof projectId !== "string") throw new Error("Choose a project.");
    const { project, user, client } = await ownedProject(projectId);
    if (project.owner_id !== user.id)
      throw new Error("Only the account owner can manage billing.");
    const { data, error } = await client
      .from("subscriptions")
      .select("id")
      .eq("project_id", projectId)
      .order("event_created", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("There is no Pro subscription to manage.");
    const s = stripe();
    const subscription = await s.subscriptions.retrieve(data.id);
    if (subscription.metadata.projectId !== projectId)
      throw new Error("Subscription ownership could not be verified.");
    const customer =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const session = await s.billingPortal.sessions.create({
      customer,
      return_url: `${process.env.APP_URL}/projects/${projectId}/overview`,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    return failure(e);
  }
}
