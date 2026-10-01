import { timingSafeEqual } from "node:crypto";
import { admin } from "../../../../lib/server";
import { deliverNotifications } from "../../../../lib/services/notifications";
export const maxDuration = 120;
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET,
    supplied = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (
    !expected ||
    Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  )
    return new Response(null, { status: 401 });
  try {
    const service = admin(),
      notifications = await deliverNotifications(5);
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
    const { error } = await service
      .from("analytics_events")
      .delete()
      .lt("created_at", cutoff);
    if (error) throw error;
    const { data: uploads, error: uploadsError } = await service
      .from("asset_uploads")
      .select("id,storage_key")
      .lt("created_at", new Date(Date.now() - 3 * 3600000).toISOString())
      .order("created_at")
      .limit(50);
    if (uploadsError) throw uploadsError;
    let cleanedUploads = 0;
    let deferredUploads = 0;
    for (const u of uploads || []) {
      const { data: asset, error: assetError } = await service
        .from("assets")
        .select("id")
        .eq("id", u.id)
        .maybeSingle();
      if (assetError) throw assetError;
      if (!asset) {
        const { error: removal } = await service.storage
          .from("project-assets")
          .remove([u.storage_key]);
        if (removal) {
          deferredUploads++;
          continue;
        }
      }
      const { error: deletion } = await service
        .from("asset_uploads")
        .delete()
        .eq("id", u.id);
      if (deletion) throw deletion;
      cleanedUploads++;
    }
    const { error: limitsError } = await service
      .from("request_limits")
      .delete()
      .lt("resets_at", new Date(Date.now() - 86400000).toISOString());
    if (limitsError) throw limitsError;
    const { error: probesError } = await service
      .from("service_probes")
      .delete()
      .lt("created_at", new Date(Date.now() - 86400000).toISOString());
    if (probesError) throw probesError;
    return Response.json({
      ok: true,
      notifications,
      cleanedUploads,
      deferredUploads,
    });
  } catch {
    console.error(
      JSON.stringify({
        event: "maintenance_failed",
        requestId: crypto.randomUUID(),
      }),
    );
    return Response.json(
      { error: "Maintenance could not complete." },
      { status: 503 },
    );
  }
}
