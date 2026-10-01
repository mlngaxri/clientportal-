import { z } from "zod";
import { ownedProject, checkOrigin, failure } from "../../../../../lib/server";
import { siteAdapter } from "../../../../../lib/site/http";
import { BuiltinSiteAdapter } from "../../../../../lib/site/builtin";
import { SiteService, validateContent } from "../../../../../lib/site/service";
import { contentSchema } from "../../../../../lib/site/schema";
import { rateLimit } from "../../../../../lib/security/abuse";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await ownedProject(id);
    const adapter = siteAdapter();
    const [manifest, content, history] = await Promise.all([
      adapter.manifest(id),
      adapter.current(id),
      adapter.history(id),
    ]);
    return Response.json(
      { manifest, content, history },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
const input = z
  .object({
    action: z.enum(["save", "publish", "rollback"]),
    expectedRevision: z.string().min(1).max(200),
    key: z.uuid(),
    versionId: z.uuid().optional(),
    content: contentSchema.optional(),
  })
  .strict();
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const { id } = await params;
    const { client, user, project } = await ownedProject(id);
    await rateLimit("site-change", user.id, 30);
    const body = input.parse(await req.json());
    const adapter = siteAdapter();
    if (body.action === "save") {
      if (!(adapter instanceof BuiltinSiteAdapter))
        throw new Error("This website connection supports publishing only.");
      const content = contentSchema.parse(body.content),
        manifest = await adapter.manifest(id);
      const issues = validateContent(manifest, content);
      if (issues.length) throw new Error(issues.join("\n"));
      const result = await adapter.command(
        {
          projectId: id,
          content,
          expectedRevision: body.expectedRevision,
          idempotencyKey: body.key,
        },
        "save",
      );
      return Response.json({ revision: String(result.document.revision) });
    }
    if (project.phase !== "LIVE")
      throw new Error("Website publishing begins after launch.");
    if (adapter instanceof BuiltinSiteAdapter) {
      const result = await adapter.command(
        {
          projectId: id,
          content: body.content,
          expectedRevision: body.expectedRevision,
          idempotencyKey: body.key,
          versionId:
            body.action === "rollback"
              ? z.uuid().parse(body.versionId)
              : undefined,
        },
        body.action,
      );
      return Response.json({ version: await adapter.convert(result.version) });
    }
    if (body.content) {
      const manifest = await adapter.manifest(id);
      const assets = manifest.pages
        .flatMap((p) => p.fields)
        .filter((f) => f.kind === "image")
        .map((f) => body.content!.fields[f.id])
        .filter(Boolean);
      if (assets.length) {
        const { data, error } = await client
          .from("assets")
          .select("id,mime")
          .eq("project_id", id)
          .in("id", assets);
        if (
          error ||
          assets.some(
            (a) =>
              !data?.some(
                (i) =>
                  i.id === a && /^image\/(png|jpeg|webp|gif)$/.test(i.mime),
              ),
          )
        )
          throw new Error("An image does not belong to this website.");
      }
    }
    const service = new SiteService(adapter);
    const version =
      body.action === "rollback"
        ? await service.rollback(
            id,
            z.uuid().parse(body.versionId),
            body.expectedRevision,
            body.key,
          )
        : await service.publish(
            id,
            contentSchema.parse(body.content),
            body.expectedRevision,
            body.key,
          );
    return Response.json({ version });
  } catch (e) {
    return failure(e);
  }
}
