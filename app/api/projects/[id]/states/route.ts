import { z } from "zod";
import { ownedProject, checkOrigin, failure } from "../../../../../lib/server";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params, { client } = await ownedProject(id);
    const { data, error } = await client.from("state_releases").select("states,board_version,activated_at").eq("project_id", id).maybeSingle();
    if (error) throw error;
    return Response.json({ release: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req);
    const { id } = await params, { client } = await ownedProject(id);
    const body = z.object({ boardId: z.uuid(), expected: z.number().int().nonnegative(), key: z.uuid() }).strict().parse(await req.json());
    const { data, error } = await client.rpc("activate_state_schedules", { pid: id, board_id: body.boardId, expected: body.expected, command_key: body.key });
    if (error) throw new Error(error.message);
    return Response.json({ release: data });
  } catch (error) { return failure(error); }
}
