import type { BoardObject } from "./model";
export type UploadedAsset = { id: string; name: string; mime: string; url: string };
export function assetType(mime: string): BoardObject["type"] {
  return mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "file";
}
async function json(response: Response) {
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || "Upload failed. Try again.");
  return value;
}
export async function uploadAsset(projectId: string, file: File, onProgress: (value: number) => void = () => {}, signal?: AbortSignal): Promise<UploadedAsset> {
  onProgress(0);
  const reservation = await json(await fetch(`/api/projects/${projectId}/upload`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, mime: file.type }), signal }));
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const cleanup = () => signal?.removeEventListener("abort", abort);
    const abort = () => { xhr.abort(); cleanup(); reject(new Error("Upload cancelled.")); };
    xhr.open("PUT", reservation.signedUrl);
    xhr.timeout = 15 * 60 * 1000;
    xhr.setRequestHeader("Content-Type", reservation.mime);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.min(95, Math.round(e.loaded / e.total * 95))); };
    xhr.onload = () => { cleanup(); xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed. Try again.")); };
    xhr.onerror = () => { cleanup(); reject(new Error("Network unavailable. Try again.")); };
    xhr.ontimeout = () => { cleanup(); reject(new Error("Upload timed out. Try again.")); };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort(); else xhr.send(file);
  });
  const asset = await json(await fetch(`/api/projects/${projectId}/upload`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: reservation.id }), signal }));
  onProgress(100);
  return asset;
}
