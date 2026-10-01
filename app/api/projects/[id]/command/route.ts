import { after } from "next/server";
import { deliverNotifications } from "../../../../../lib/services/notifications";
import { validateState, type ScheduledState } from "../../../../../lib/states";
import { z } from "zod";
import { ownedProject, checkOrigin, failure } from "../../../../../lib/server";
const input = z.object({
  action: z.string(),
  payload: z.record(z.string(), z.unknown()).default({}),
  expected: z.number().int().nonnegative(),
  key: z.uuid(),
});
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const { id } = await params;
    const { client } = await ownedProject(id);
    const body = input.parse(await req.json());
    if (
      body.action === "save_board" &&
      body.payload.data &&
      typeof body.payload.data === "object" &&
      "states" in body.payload.data
    ) {
      const states = (body.payload.data as { states: unknown }).states;
      if (
        !Array.isArray(states) ||
        states.length > 100 ||
        states.some((s) => validateState(s as ScheduledState).length) ||
        new Set(states.map((s) => s.id)).size !== states.length
      )
        throw new Error(
          "Invalid State schedules. Check names, weekdays, times and priorities.",
        );
    }
    if (body.action === "deliver") {
      const url = new URL(String(body.payload.url || ""));
      const local =
        process.env.APP_ENV === "development" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname);
      if (url.protocol !== "https:" && !local)
        throw new Error("Use a real HTTPS review address.");
    }
    const { data, error } = await client.rpc("project_command", {
      pid: id,
      action: body.action,
      payload: body.payload,
      expected: body.expected,
      command_key: body.key,
    });
    if (error) throw new Error(error.message);
    after(() => deliverNotifications());
    return Response.json(data);
  } catch (e) {
    return failure(e);
  }
}
