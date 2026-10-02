import { capabilities } from "../../../../../lib/capabilities";
import { z } from "zod";
import { ownedProject, checkOrigin, failure } from "../../../../../lib/server";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client, user } = await ownedProject(id);
    const { data, error } = await client
      .from("project_settings")
      .select("*")
      .eq("project_id", id)
      .maybeSingle();
    if (error) throw error;
    return Response.json({
      settings: data || {
        revision: 0,
        timezone: "Australia/Brisbane",
        notify_forms: true,
        notify_project: true,
        connections: {},
      },
      email: user.email,
      emailAvailable: capabilities().email,
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
      .object({
        expected: z.number().int().nonnegative(),
        timezone: z.string().max(100),
        notifyForms: z.boolean(),
        notifyProject: z.boolean(),
      })
      .strict()
      .parse(await req.json());
    const { data, error } = await client.rpc("update_project_settings", {
      pid: id,
      expected: body.expected,
      value: body,
    });
    if (error) throw new Error(error.message);
    return Response.json({ settings: data });
  } catch (e) {
    return failure(e);
  }
}
