import { timingSafeEqual } from "node:crypto";
import { admin } from "../../../lib/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const expected = process.env.HEALTHCHECK_TOKEN;
  const supplied =
    req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (
    !expected ||
    Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  )
    return Response.json(
      { error: "Access denied." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const { error } = await admin()
      .from("projects")
      .select("id", { count: "exact", head: true });
    if (error) throw new Error("database");
    return Response.json(
      {
        status: "ok",
        database: "reachable",
        requestId,
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error(JSON.stringify({ event: "health_failure", requestId }));
    return Response.json(
      { status: "degraded", requestId },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
