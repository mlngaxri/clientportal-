import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
function key() {
  const secret =
    process.env.SITE_ADAPTER_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Website checks are not configured.");
  return secret;
}
export function signBody(value: string) {
  return createHmac("sha256", key()).update(value).digest("hex");
}
export function signedEqual(value: string, signed: string) {
  const expected = signBody(value);
  return (
    /^[a-f0-9]{64}$/.test(signed) &&
    timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signed, "hex"))
  );
}
export function createProbe(projectId: string, revision: number) {
  const value = {
    projectId,
    revision,
    nonce: randomUUID(),
    expires: Date.now() + 60000,
  };
  const raw = Buffer.from(JSON.stringify(value)).toString("base64url");
  return { value, token: `${raw}.${signBody(raw)}` };
}
export function readProbe(token: string) {
  try {
    const [raw, signed] = token.split(".");
    if (!raw || !signed || !signedEqual(raw, signed)) return null;
    const value = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (
      typeof value.projectId !== "string" ||
      !Number.isSafeInteger(value.revision) ||
      typeof value.nonce !== "string" ||
      value.expires < Date.now() ||
      value.expires > Date.now() + 65000
    )
      return null;
    return value as {
      projectId: string;
      revision: number;
      nonce: string;
      expires: number;
    };
  } catch {
    return null;
  }
}
