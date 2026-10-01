export const REMEMBER_SECONDS = 30 * 86400;
export const SESSION_SECONDS = 8 * 3600;
export function sessionExpired(expiry: string | undefined, now = Date.now()) {
  return expiry !== undefined && (!/^\d+$/.test(expiry) || Number(expiry) <= now);
}
export function sessionCookieOptions(remember: boolean, expiry?: string) {
  const remaining = expiry ? Math.max(0, Math.ceil((Number(expiry) - Date.now()) / 1000)) : remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // Unchecked means a browser session cookie, with an independent server expiry.
    ...(remember ? { maxAge: remaining } : {}),
  };
}
