import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const authRoute = new URL("../../app/api/auth/route.ts", import.meta.url);
const callbackRoute = new URL("../../app/auth/callback/route.ts", import.meta.url);
const middleware = new URL("../../middleware.ts", import.meta.url);

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
