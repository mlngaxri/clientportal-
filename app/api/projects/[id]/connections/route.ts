import { z } from "zod";
import { ownedProject, checkOrigin, failure } from "../../../../../lib/server";
const link = z.union([
  z.literal(""),
  z
    .url()
    .max(2000)
    .refine((v) => {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password;
    }),
]);
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
        booking: link,
        social: link,
      })
      .strict()
      .parse(await req.json());
    const { data, error } = await client.rpc("save_connections", {
      pid: id,
      expected: body.expected,
      value: { booking: body.booking, social: body.social },
    });
    if (error) throw new Error(error.message);
    return Response.json({ settings: data });
  } catch (e) {
    return failure(e);
  }
}
