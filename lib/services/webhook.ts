import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyEmailWebhook(
  body: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
) {
  const id = headers.get("svix-id"),
    timestamp = headers.get("svix-timestamp"),
    signatures = headers.get("svix-signature");
  if (
    !id ||
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    !signatures ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !secret.startsWith("whsec_")
  )
    throw new Error("Invalid webhook signature.");
  const key = Buffer.from(secret.slice(6), "base64");
  if (!key.length) throw new Error("Invalid webhook secret.");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest();
  const valid = signatures.split(" ").some((s) => {
    const [v, signed] = s.split(",");
    if (v !== "v1" || !signed) return false;
    const value = Buffer.from(signed, "base64");
    return value.length === expected.length && timingSafeEqual(value, expected);
  });
  if (!valid) throw new Error("Invalid webhook signature.");
  return id;
}
