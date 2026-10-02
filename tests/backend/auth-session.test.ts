import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REMEMBER_SECONDS,
  SESSION_SECONDS,
  sessionExpiry,
  sessionExpired,
  sessionCookieOptions,
  signSessionExpiry,
  verifiedSessionExpiry,
  isAuthSessionCookie,
} from "../../lib/auth-session";

test("session expiry uses the selected lifetime from a stable clock", () => {
  const now = 1_800_000_000_000;
  assert.equal(sessionExpiry(false, now), String(now + SESSION_SECONDS * 1000));
  assert.equal(sessionExpiry(true, now), String(now + REMEMBER_SECONDS * 1000));
});

test("session expiry rejects malformed and elapsed values", () => {
  const now = 1_800_000_000_000;
  assert.equal(sessionExpired(undefined, now), false);
  assert.equal(sessionExpired("not-a-time", now), true);
  assert.equal(sessionExpired(String(now), now), true);
  assert.equal(sessionExpired(String(now + 1), now), false);
});

test("remembered sessions receive persistent cookie lifetime while normal sessions stay browser-scoped", () => {
  const previous = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  const now = 1_800_000_000_000;
  const expiry = String(now + 60_001);
  const remembered = sessionCookieOptions(true, expiry, now);
  const transient = sessionCookieOptions(false, expiry, now);
  assert.equal(remembered.httpOnly, true);
  assert.equal(remembered.secure, true);
  assert.equal(remembered.sameSite, "lax");
  assert.equal(remembered.maxAge, 61);
  assert.equal(transient.maxAge, undefined);
  assert.equal("expires" in transient ? transient.expires : undefined, undefined);
  assert.equal(
    { maxAge: 86400, expires: new Date(now + 86400_000), ...transient }.maxAge,
    undefined,
    "transient policy must override provider maxAge persistence",
  );
  assert.equal(
    { maxAge: 86400, expires: new Date(now + 86400_000), ...transient }.expires,
    undefined,
    "transient policy must override provider expires persistence",
  );
  if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Object.assign(process.env, { NODE_ENV: previous });
});

test("remembered cookie lifetime is derived from the same injected clock as its expiry", () => {
  const now = 1_800_000_000_000;
  const expiry = sessionExpiry(true, now);
  assert.equal(sessionCookieOptions(true, expiry, now).maxAge, REMEMBER_SECONDS);
});

test("session lifetimes reject removed, forged, changed and expired proofs", async () => {
  const secret = "test-secret-with-independent-session-key",
    now = 1_800_000_000_000,
    expiry = String(now + SESSION_SECONDS * 1000);
  const token = await signSessionExpiry(expiry, secret);
  assert.equal(await verifiedSessionExpiry(token, secret, now), expiry);
  assert.equal(await verifiedSessionExpiry(undefined, secret, now), null);
  assert.equal(await verifiedSessionExpiry(expiry, secret, now), null);
  assert.equal(
    await verifiedSessionExpiry(
      token.replace(expiry, String(now + REMEMBER_SECONDS * 1000)),
      secret,
      now,
    ),
    null,
  );
  assert.equal(await verifiedSessionExpiry(token, "other-key", now), null);
  assert.equal(
    await verifiedSessionExpiry(token, secret, Number(expiry)),
    null,
  );
});

test("expired sessions clear only Supabase auth-token cookies while preserving unrelated and PKCE cookies", () => {
  assert.equal(isAuthSessionCookie("sb-project-auth-token"), true);
  assert.equal(isAuthSessionCookie("sb-project-auth-token.0"), true);
  assert.equal(isAuthSessionCookie("sb-project-auth-token.12"), true);
  assert.equal(
    isAuthSessionCookie("sb-project-auth-token-code-verifier"),
    false,
  );
  assert.equal(isAuthSessionCookie("sb-project-preferences"), false);
  assert.equal(isAuthSessionCookie("sb-unrelated-cookie"), false);
});
