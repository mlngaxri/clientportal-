export const REMEMBER_SECONDS = 30 * 86400;
export const SESSION_SECONDS = 8 * 3600;
export function sessionExpiry(remember: boolean, now = Date.now()) {
  return String(now + (remember ? REMEMBER_SECONDS : SESSION_SECONDS) * 1000);
}
export function sessionExpired(expiry: string | undefined, now = Date.now()) {
  return (
    expiry !== undefined && (!/^\d+$/.test(expiry) || Number(expiry) <= now)
  );
}
export function sessionCookieOptions(remember: boolean, expiry?: string) {
  const remaining = expiry
    ? Math.max(0, Math.ceil((Number(expiry) - Date.now()) / 1000))
    : remember
      ? REMEMBER_SECONDS
      : SESSION_SECONDS;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // Unchecked means a browser session cookie, with an independent server expiry.
    ...(remember ? { maxAge: remaining } : {}),
  };
}

function signingSecret() {
  return (
    process.env.SESSION_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
async function signingKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
export async function signSessionExpiry(
  expiry: string,
  secret = signingSecret(),
) {
  if (!secret || !/^\d+$/.test(expiry))
    throw new Error("Account services are not configured yet.");
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    new TextEncoder().encode(`fourthform-session:${expiry}`),
  );
  return `${expiry}.${Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}
export async function verifiedSessionExpiry(
  token: string | undefined,
  secret = signingSecret(),
  now = Date.now(),
): Promise<string | null> {
  if (!secret || !token) return null;
  const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!match || sessionExpired(match[1], now)) return null;
  const bytes = Uint8Array.from(match[2].match(/../g)!, (b) => parseInt(b, 16));
  try {
    return (await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      bytes,
      new TextEncoder().encode(`fourthform-session:${match[1]}`),
    ))
      ? match[1]
      : null;
  } catch {
    return null;
  }
}

export function isAuthSessionCookie(name: string) {
  return name.startsWith("sb-") && !name.includes("code-verifier");
}
