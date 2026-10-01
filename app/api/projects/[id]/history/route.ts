import { ownedProject, failure } from "../../../../../lib/server";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client } = await ownedProject(id);
    const { data, error } = await client
      .from("audit_events")
      .select("id,type,created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return Response.json({ events: data || [] });
  } catch (e) {
    return failure(e);
  }
}
