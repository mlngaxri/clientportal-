import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const authRoute = new URL("../../app/api/auth/route.ts", import.meta.url);
const accountRoute = new URL("../../app/api/account/route.ts", import.meta.url);
const callbackRoute = new URL("../../app/auth/callback/route.ts", import.meta.url);
const supabaseConfig = new URL("../../supabase/config.toml", import.meta.url);
const middleware = new URL("../../middleware.ts", import.meta.url);
const server = new URL("../../lib/server.ts", import.meta.url);

async function source(url: URL) {
  return readFile(url, "utf8");
}

test("auth entry paths derive expiry from the shared session policy", async () => {
  for (const [name, text] of [
    ["password/OAuth entry", await source(authRoute)],
    ["OAuth callback", await source(callbackRoute)],
  ] as const) {
    assert.match(text, /sessionExpiry\s*\(/, `${name} must use sessionExpiry()`);
    assert.doesNotMatch(text, /Date\.now\(\)\s*\+\s*\([^\n]*REMEMBER_SECONDS|Date\.now\(\)\s*\+\s*\([^\n]*SESSION_SECONDS/, `${name} must not duplicate session lifetime arithmetic`);
    assert.doesNotMatch(text, /\b(?:REMEMBER_SECONDS|SESSION_SECONDS)\b/, `${name} must not own session lifetime constants`);
  }
});

test("password recovery callbacks cannot inherit a stale remembered-session policy", async () => {
  const text = await source(callbackRoute);
  assert.match(text, /const returnPath = safeReturnPath\(url\.searchParams\.get\("next"\)\);/);
  assert.match(text, /const recovery = returnPath === "\/account\/password";/);
  assert.match(text, /const remember = !recovery && jar\.get\("ff-remember"\)\?\.value === "yes";/);
  assert.match(text, /if \(recovery\) \{[\s\S]*?jar\.delete\("ff-remember"\);[\s\S]*?\}/);
});

test("auth callback preserves the request origin that owns its session cookies", async () => {
  const text = await source(callbackRoute);
  assert.match(text, /NextResponse\.redirect\(new URL\(returnPath, url\.origin\)\)/);
  assert.match(text, /NextResponse\.redirect\(new URL\("\/start\?error=signin", url\.origin\)\)/);
  assert.doesNotMatch(text, /new URL\(returnPath, process\.env\.APP_URL/);
});

test("password recovery redirect remains an absolute callback without APP_URL", async () => {
  const text = await source(accountRoute);
  assert.match(text, /const callback = new URL\(\s*"\/auth\/callback",\s*process\.env\.APP_URL \|\| new URL\(req\.url\)\.origin\s*\);/);
  assert.match(text, /callback\.searchParams\.set\("next", "\/account\/password"\);/);
  assert.match(text, /redirectTo: callback\.toString\(\)/);
  assert.doesNotMatch(text, /redirectTo:\s*`\$\{process\.env\.APP_URL\}/);
});

test("signup callback normalizes APP_URL before provider handoff", async () => {
  const text = await source(authRoute);
  assert.match(text, /const emailRedirect = new URL\([\s\S]*?"\/auth\/callback",[\s\S]*?process\.env\.APP_URL \|\| new URL\(req\.url\)\.origin,[\s\S]*?\);/);
  assert.match(text, /emailRedirect\.searchParams\.set\("next", next\);/);
  assert.match(text, /emailRedirectTo: emailRedirect\.toString\(\)/);
  assert.doesNotMatch(text, /emailRedirectTo:\s*`\$\{process\.env\.APP_URL/);
});

test("local Supabase allows the exact recovery callback on both acceptance hosts", async () => {
  const text = await source(supabaseConfig);
  for (const host of ["localhost", "127.0.0.1"]) {
    assert.match(text, new RegExp(`http://${host.replaceAll(".", "\\.")}:4173/auth/callback\\?next=/account/password`));
  }
});

test("middleware verifies and refreshes a session from one stable clock", async () => {
  const text = await source(middleware);
  assert.match(text, /const sessionNow = Date\.now\(\);/);
  assert.match(text, /verifiedSessionExpiry\([\s\S]*?undefined,\s*sessionNow,\s*\)/);
  assert.match(text, /sessionCookieOptions\(remember, expiry, sessionNow\)/);
});

test("server Supabase cookies verify and refresh from one stable clock", async () => {
  const text = await source(server);
  assert.match(text, /const sessionNow = Date\.now\(\);/);
  assert.match(text, /verifiedSessionExpiry\([\s\S]*?undefined,\s*sessionNow,\s*\)/);
  assert.match(text, /sessionCookieOptions\([\s\S]*?newSession\?\.expiry \?\? expiry \?\? undefined,\s*sessionNow,\s*\)/);
});

test("customer Supabase sessions do not depend on the service-role credential", async () => {
  const text = await source(server);
  const configured = text.match(/export function configured\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(configured, "customer configuration guard must remain explicit");
  assert.match(configured, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(configured, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(configured, /SUPABASE_SERVICE_ROLE_KEY/, "customer auth/data sessions must not require an administrator secret");
  const admin = text.match(/export function admin\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(admin, "administrator client guard must remain explicit");
  assert.match(admin, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(admin, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("logout delegates Supabase token cleanup and clears only Fourthform session proofs", async () => {
  const text = await source(authRoute);
  const logout = text.match(/if \(body\.mode === "logout"\) \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(logout, "logout branch must remain explicit");
  assert.match(logout, /client\.auth\.signOut\(\{ scope: "local" \}\)/);
  assert.match(logout, /jar\.delete\("ff-remember"\)/);
  assert.match(logout, /jar\.delete\("ff-session-until"\)/);
  assert.doesNotMatch(logout, /jar\.delete\([^)]*sb-|getAll\(\)[\s\S]*?delete/);
});
