import { ownedProject, failure } from "../../../../lib/server";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client, project } = await ownedProject(id);
    const { data: boards, error } = await client
      .from("boards")
      .select("*")
      .eq("project_id", id)
      .order("created_at");
    if (error) throw error;
    return Response.json({ project, boards });
  } catch (e) {
    return failure(e);
  }
}
