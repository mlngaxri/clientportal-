import {
  ownedProject,
  admin,
  checkOrigin,
  failure,
} from "../../../../../lib/server";
import { checkDeployment } from "../../../../../lib/services/domains";
import { appOrigin, siteUrl } from "../../../../../lib/site/builtin";
import { rateLimit } from "../../../../../lib/security/abuse";
export const maxDuration = 60;
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { client } = await ownedProject(id);
    const { data, error } = await client
      .from("integration_receipts")
      .select("kind,evidence,verified_at")
      .eq("project_id", id);
    if (error) throw error;
    const { data: document, error: documentError } = await client.from("site_documents").select("revision").eq("project_id", id).maybeSingle();
    if (documentError) throw documentError;
    return Response.json({ checks: data || [], revision: String(document?.revision || "") });
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
    const { client, user, project } = await ownedProject(id);
    await rateLimit("launch-check", user.id, 5);
    if (project.phase !== "LAUNCH")
      throw new Error(
        "Approval and payment are required before checking launch.",
      );
    const { data: d } = await client
      .from("site_documents")
      .select("revision")
      .eq("project_id", id)
      .single();
    if (!d) throw new Error("Your website has not been set up.");
    const service = admin();
    const release = await service.rpc("prepare_site_release", {
      pid: id,
      expected: d.revision,
    });
    if (release.error) throw release.error;
    const url = await siteUrl(id),
      origin = new URL(url).origin,
      domain = new URL(url).hostname;
    if (project.launch.domain !== domain)
      throw new Error(
        "The saved launch domain does not match the connected website.",
      );
    const probe = await checkDeployment(
      id,
      d.revision,
      origin === new URL(appOrigin()).origin ? appOrigin() : origin,
    );
    const receipts = ["domain", "analytics", "forms", "seo", "deployment"].map(
      (kind) => ({
        project_id: id,
        kind,
        evidence: {
          revision: String(d.revision),
          domain,
          url,
          storage: probe.storage,
          versionId: release.data.id,
          delivery: kind === "forms" ? "portal inbox" : undefined,
        },
        verified_at: new Date().toISOString(),
      }),
    );
    const { error } = await service
      .from("integration_receipts")
      .upsert(receipts, { onConflict: "project_id,kind" });
    if (error) throw error;
    return Response.json({ checks: receipts });
  } catch (e) {
    return failure(e);
  }
}
