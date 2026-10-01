/** Shared file metadata policy. Storage remains private until content validation succeeds. */
export const DEFAULT_UPLOAD_LIMIT = 100 * 1024 * 1024;
const types: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg",
  pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv", txt: "text/plain", zip: "application/zip", woff: "font/woff", woff2: "font/woff2",
};
export function uploadMetadata(name: string, size: number, mime = "", limit = DEFAULT_UPLOAD_LIMIT) {
  if (!Number.isSafeInteger(size) || size < 1 || size > limit) throw new Error(`Choose a file between 1 byte and ${Math.floor(limit / 1024 / 1024)} MB.`);
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (!types[ext]) throw new Error("This file type is not supported.");
  return { ext, mime: ext === "webm" && mime.startsWith("audio/") ? "audio/webm" : types[ext], name: name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200) || `upload.${ext}` };
}
export function validateUploadContent(bytes: Uint8Array, ext: string) {
  const ascii = new TextDecoder().decode(bytes.slice(0, 512)).toLowerCase();
  const starts = (...signature: number[]) => signature.every((b, i) => bytes[i] === b);
  if (ascii.trimStart().startsWith("<") && /<(script|html|svg|!doctype)/.test(ascii) || starts(77, 90) || starts(127, 69, 76, 70)) throw new Error("This upload contains unsafe executable content.");
  const valid: Record<string, boolean> = {
    png: starts(137, 80, 78, 71, 13, 10, 26, 10), jpg: starts(255, 216, 255), jpeg: starts(255, 216, 255), gif: ascii.startsWith("gif87a") || ascii.startsWith("gif89a"), webp: ascii.startsWith("riff") && ascii.slice(8, 12) === "webp",
    pdf: ascii.startsWith("%pdf-"), zip: starts(80, 75, 3, 4) || starts(80, 75, 5, 6),
    docx: starts(80, 75, 3, 4), xlsx: starts(80, 75, 3, 4), pptx: starts(80, 75, 3, 4),
    webm: starts(26, 69, 223, 163), mp4: ascii.slice(4, 8) === "ftyp", m4a: ascii.slice(4, 8) === "ftyp", mov: ["ftyp", "moov", "mdat", "wide"].includes(ascii.slice(4, 8)),
    wav: ascii.startsWith("riff") && ascii.slice(8, 12) === "wave", ogg: ascii.startsWith("oggs"), mp3: ascii.startsWith("id3") || (bytes[0] === 255 && (bytes[1] & 224) === 224),
    woff: ascii.startsWith("woff"), woff2: ascii.startsWith("wof2"),
  };
  if (valid[ext] === false) throw new Error("File contents do not match its extension.");
  if (["txt", "csv"].includes(ext) && bytes.slice(0, 4096).includes(0)) throw new Error("This text file contains binary data.");
}
export const needsMalwareScan = (ext: string) => ["pdf", "docx", "xlsx", "pptx", "zip"].includes(ext);
