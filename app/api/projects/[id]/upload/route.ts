import {
  ownedProject,
  admin,
  checkOrigin,
  failure,
} from "../../../../../lib/server";
import { rateLimit } from "../../../../../lib/security/abuse";
import {
  DEFAULT_UPLOAD_LIMIT,
  uploadMetadata,
  validateUploadContent,
  needsMalwareScan,
} from "../../../../../lib/uploads";
export const maxDuration = 120;
const limit = () =>
  Math.min(
    1024 * 1024 * 1024,
    Math.max(1, Number(process.env.UPLOAD_MAX_BYTES) || DEFAULT_UPLOAD_LIMIT),
  );
async function authorize(req: Request, params: Promise<{ id: string }>) {
  checkOrigin(req);
  const { id } = await params;
  const { project, user } = await ownedProject(id);
  if (req.method === "POST") {
    await rateLimit("upload-minute", user.id, 20, 60);
    await rateLimit("upload-day", user.id, 200, 86400);
  }
  if (
    ![
      "DIRECTION",
      "BUILDING",
      "REVIEW",
      "REVISION_IN_PROGRESS",
      "LIVE",
    ].includes(project.phase)
  )
    throw new Error("Uploads are not available now");
  return id;
}
/** Reserve a private object and return a scoped, expiring storage upload URL. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const projectId = await authorize(req, params);
    const payload = await req.json();
    const metadata = uploadMetadata(
      String(payload.name || ""),
      payload.size,
      String(payload.mime || ""),
      limit(),
    );
    if (needsMalwareScan(metadata.ext) && !process.env.FILE_SCAN_URL)
      throw new Error(
        "Document uploads are temporarily unavailable. Image, video, audio and text uploads are available.",
      );
    const service = admin(),
      id = crypto.randomUUID(),
      storageKey = `${projectId}/${id}.${metadata.ext}`;
    const { error } = await service
      .from("asset_uploads")
      .insert({
        id,
        project_id: projectId,
        storage_key: storageKey,
        name: metadata.name,
        mime: metadata.mime,
        bytes: payload.size,
      });
    if (error) throw error;
    const { data, error: signingError } = await service.storage
      .from("project-assets")
      .createSignedUploadUrl(storageKey);
    if (signingError || !data) {
      await service.from("asset_uploads").delete().eq("id", id);
      throw signingError || new Error("Upload could not start.");
    }
    return Response.json({
      id,
      signedUrl: data.signedUrl,
      mime: metadata.mime,
    });
  } catch (e) {
    return failure(e);
  }
}
/** Publish metadata only after content validation (and scanning for document containers). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const projectId = await authorize(req, params);
    const { id } = await req.json();
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
      throw new Error("Invalid upload.");
    const service = admin();
    const { data: existing } = await service
      .from("assets")
      .select("id,name,mime")
      .eq("id", id)
      .eq("project_id", projectId)
      .maybeSingle();
    if (existing)
      return Response.json({ ...existing, url: `/api/assets/${id}` });
    const { data: upload, error } = await service
      .from("asset_uploads")
      .select("*")
      .eq("id", id)
      .eq("project_id", projectId)
      .single();
    if (
      error ||
      !upload ||
      Date.now() - Date.parse(upload.created_at) > 2 * 60 * 60 * 1000
    )
      throw new Error("Upload expired. Try again.");
    const bucket = service.storage.from("project-assets");
    const { data: info, error: infoError } = await bucket.info(
      upload.storage_key,
    );
    if (infoError || !info)
      throw new Error("Upload has not finished. Try again.");
    try {
      if (
        typeof info.size !== "number" ||
        info.size !== upload.bytes ||
        info.size > limit()
      )
        throw new Error("Uploaded file size did not match. Try again.");
      const ext = upload.storage_key.split(".").pop()!;
      const { data: signed, error: signError } = await bucket.createSignedUrl(
        upload.storage_key,
        120,
      );
      if (signError || !signed)
        throw new Error("Upload validation could not start.");
      const response = await fetch(signed.signedUrl, {
        headers: { Range: "bytes=0-4095" },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok || !response.body)
        throw new Error("Uploaded bytes are unavailable.");
      const reader = response.body.getReader(),
        parts: Uint8Array[] = [];
      let length = 0;
      try {
        while (length < 4096) {
          const part = await reader.read();
          if (part.done) break;
          const bytes = part.value.slice(0, 4096 - length);
          parts.push(bytes);
          length += bytes.length;
        }
      } finally {
        await reader.cancel();
      }
      validateUploadContent(Buffer.concat(parts), ext);
      if (needsMalwareScan(ext)) {
        if (!process.env.FILE_SCAN_URL)
          throw new Error("Document scanning is unavailable.");
        if (info.size > 16 * 1024 * 1024)
          throw new Error("Choose a document smaller than 16 MB.");
        const full = await fetch(signed.signedUrl, {
          redirect: "error",
          signal: AbortSignal.timeout(20000),
        });
        if (!full.ok) throw new Error("Document bytes are unavailable.");
        const scan = await fetch(process.env.FILE_SCAN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            ...(process.env.FILE_SCAN_TOKEN
              ? { Authorization: `Bearer ${process.env.FILE_SCAN_TOKEN}` }
              : {}),
          },
          body: await full.blob(),
          signal: AbortSignal.timeout(90000),
        });
        const result = await scan.json().catch(() => ({}));
        if (!scan.ok || result.clean !== true)
          throw new Error(
            "This document could not be verified as safe. Try another file.",
          );
      }
    } catch (e) {
      await service.storage.from("project-assets").remove([upload.storage_key]);
      await service.from("asset_uploads").delete().eq("id", id);
      throw e;
    }
    const { error: insertError } = await service
      .from("assets")
      .insert({
        id,
        project_id: projectId,
        storage_key: upload.storage_key,
        name: upload.name,
        mime: upload.mime,
        bytes: upload.bytes,
      });
    if (insertError) {
      // A concurrent finalize may already have committed the same immutable asset.
      const { data: committed } = await service
        .from("assets")
        .select("id")
        .eq("id", id)
        .eq("project_id", projectId)
        .maybeSingle();
      if (!committed) throw insertError;
    }
    await service.from("asset_uploads").delete().eq("id", id);
    return Response.json({
      id,
      name: upload.name,
      mime: upload.mime,
      url: `/api/assets/${id}`,
    });
  } catch (e) {
    return failure(e);
  }
}
