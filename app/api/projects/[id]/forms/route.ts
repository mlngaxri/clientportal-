import { z } from "zod";
import { ownedProject, checkOrigin, failure } from "../../../../../lib/server";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client } = await ownedProject(id);
    const url = new URL(req.url),
      before = url.searchParams.get("before");
    let query = client
      .from("form_submissions")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50);
    if (before) query = query.lt("created_at", z.iso.datetime().parse(before));
    const { data, error } = await query;
    if (error) throw error;
    return Response.json({
      messages: data || [],
      next: data?.length === 50 ? data[49].created_at : null,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const { id } = await params;
    const { client } = await ownedProject(id);
    const body = z
      .object({ id: z.uuid(), status: z.enum(["new", "read", "archived"]) })
      .parse(await req.json());
    const { error } = await client.rpc("set_form_status", {
      pid: id,
      submission: body.id,
      new_status: body.status,
    });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
