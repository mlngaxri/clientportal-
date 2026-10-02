export const REMEMBER_SECONDS = 30 * 86400;
export const SESSION_SECONDS = 8 * 3600;
export function sessionExpiry(remember: boolean, now = Date.now()) {
  return String(now + (remember ? REMEMBER_SECONDS : SESSION_SECONDS) * 1000);
}
export function sessionExpired(expiry: string | undefined, now = Date.now()) {
  return expiry !== undefined && (!/^\d+$/.test(expiry) || Number(expiry) <= now);
}
export function sessionCookieOptions(remember: boolean, expiry?: string, now = Date.now()) {
  const remaining = expiry ? Math.max(0, Math.ceil((Number(expiry) - now) / 1000)) : remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  const secure = process.env.APP_ENV === "development" ? false : process.env.NODE_ENV === "production";
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", ...(remember ? { maxAge: remaining } : { maxAge: undefined, expires: undefined }) };
}
function signingSecret() { return process.env.SESSION_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY; }
async function signingKey(secret: string) { return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
async function signExpiry(expiry: string, purpose: string, secret = signingSecret()) {
  if (!secret || !/^\d+$/.test(expiry)) throw new Error("Account services are not configured yet.");
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), new TextEncoder().encode(`${purpose}:${expiry}`));
  return `${expiry}.${Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}
async function verifyExpiry(token: string | undefined, purpose: string, secret = signingSecret(), now = Date.now()): Promise<string | null> {
  if (!secret || !token) return null;
  const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!match || sessionExpired(match[1], now)) return null;
  const bytes = Uint8Array.from(match[2].match(/../g)!, (b) => parseInt(b, 16));
  try { return (await crypto.subtle.verify("HMAC", await signingKey(secret), bytes, new TextEncoder().encode(`${purpose}:${match[1]}`))) ? match[1] : null; } catch { return null; }
}
export function signSessionExpiry(expiry: string, secret = signingSecret()) { return signExpiry(expiry, "fourthform-session", secret); }
export function verifiedSessionExpiry(token: string | undefined, secret = signingSecret(), now = Date.now()) { return verifyExpiry(token, "fourthform-session", secret, now); }
export function signRecoveryExpiry(expiry: string, secret = signingSecret()) { return signExpiry(expiry, "fourthform-recovery", secret); }
export function verifiedRecoveryExpiry(token: string | undefined, secret = signingSecret(), now = Date.now()) { return verifyExpiry(token, "fourthform-recovery", secret, now); }
export function isAuthSessionCookie(name: string) { return /^sb-.+-auth-token(?:\.\d+)?$/.test(name); }
