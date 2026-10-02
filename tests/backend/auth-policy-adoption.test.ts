import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const authRoute = new URL("../../app/api/auth/route.ts", import.meta.url);
const callbackRoute = new URL("../../app/auth/callback/route.ts", import.meta.url);
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
    assert.doesNotMatch(
      text,
      /Date\.now\(\)\s*\+\s*\([^\n]*REMEMBER_SECONDS|Date\.now\(\)\s*\+\s*\([^\n]*SESSION_SECONDS/,
      `${name} must not duplicate session lifetime arithmetic`,
    );
    assert.doesNotMatch(
      text,
      /\b(?:REMEMBER_SECONDS|SESSION_SECONDS)\b/,
      `${name} must not own session lifetime constants`,
    );
  }
});

test("password recovery callbacks cannot inherit a stale remembered-session policy", async () => {
  const text = await source(callbackRoute);
  assert.match(
    text,
    /const returnPath = safeReturnPath\(url\.searchParams\.get\("next"\)\);/,
    "the callback must validate the return path before choosing session policy",
  );
  assert.match(
    text,
    /const recovery = returnPath === "\/account\/password";/,
    "the password recovery destination must be identified explicitly",
  );
  assert.match(
    text,
    /const remember = !recovery && jar\.get\("ff-remember"\)\?\.value === "yes";/,
    "recovery must stay transient even when a stale remember cookie exists",
  );
  assert.match(
    text,
    /if \(recovery\) jar\.delete\("ff-remember"\);/,
    "a successful recovery exchange must clear stale remembered-session intent",
  );
  assert.match(
    text,
    /new URL\(returnPath, process\.env\.APP_URL \|\| url\.origin\)/,
    "the validated path used for policy selection must also drive the redirect",
  );
});

test("middleware verifies and refreshes a session from one stable clock", async () => {
  const text = await source(middleware);
  assert.match(text, /const sessionNow = Date\.now\(\);/);
  assert.match(
    text,
    /verifiedSessionExpiry\([\s\S]*?undefined,\s*sessionNow,\s*\)/,
    "session proof verification must use the request clock",
  );
  assert.match(
    text,
    /sessionCookieOptions\(remember, expiry, sessionNow\)/,
    "cookie refresh must use the same request clock",
  );
});

test("server Supabase cookies verify and refresh from one stable clock", async () => {
  const text = await source(server);
  assert.match(text, /const sessionNow = Date\.now\(\);/);
  assert.match(
    text,
    /verifiedSessionExpiry\([\s\S]*?undefined,\s*sessionNow,\s*\)/,
    "server session proof verification must use the request clock",
  );
  assert.match(
    text,
    /sessionCookieOptions\([\s\S]*?newSession\?\.expiry \?\? expiry \?\? undefined,\s*sessionNow,\s*\)/,
    "server provider-cookie refresh must use the same request clock",
  );
});

test("logout delegates Supabase token cleanup and clears only Fourthform session proofs", async () => {
  const text = await source(authRoute);
  const logout = text.match(
    /if \(body\.mode === "logout"\) \{([\s\S]*?)\n    \}/,
  )?.[1];
  assert.ok(logout, "logout branch must remain explicit");
  assert.match(
    logout,
    /client\.auth\.signOut\(\{ scope: "local" \}\)/,
    "Supabase must own deletion of its auth-token cookies",
  );
  assert.match(logout, /jar\.delete\("ff-remember"\)/);
  assert.match(logout, /jar\.delete\("ff-session-until"\)/);
  assert.doesNotMatch(
    logout,
    /jar\.delete\([^)]*sb-|getAll\(\)[\s\S]*?delete/,
    "logout must not broaden manual deletion to unrelated or provider cookies",
  );
});
