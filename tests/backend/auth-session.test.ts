import { test } from "node:test";
import assert from "node:assert/strict";
import { REMEMBER_SECONDS, SESSION_SECONDS, sessionExpiry, sessionExpired, sessionCookieOptions } from "../../lib/auth-session";

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
  process.env.NODE_ENV = "production";
  const remembered = sessionCookieOptions(true, String(Date.now() + 60_000));
  const transient = sessionCookieOptions(false, String(Date.now() + 60_000));
  assert.equal(remembered.httpOnly, true);
  assert.equal(remembered.secure, true);
  assert.equal(remembered.sameSite, "lax");
  assert.ok((remembered.maxAge ?? 0) > 0);
  assert.equal("maxAge" in transient, false);
  process.env.NODE_ENV = previous;
});
