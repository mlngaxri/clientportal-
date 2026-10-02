import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const callbackRoute = new URL("../../app/auth/callback/route.ts", import.meta.url);
const accountRoute = new URL("../../app/api/account/route.ts", import.meta.url);
const authSession = new URL("../../lib/auth-session.ts", import.meta.url);
async function source(url: URL) { return readFile(url, "utf8"); }

test("password updates require a recovery-scoped signed proof", async () => {
  const callback = await source(callbackRoute);
  const account = await source(accountRoute);
  const session = await source(authSession);
  assert.match(session, /signRecoveryExpiry/);
  assert.match(session, /verifiedRecoveryExpiry/);
  assert.match(session, /fourthform-recovery/);
  assert.match(callback, /jar\.set\("ff-recovery-until", await signRecoveryExpiry\(expiry\)/);
  assert.match(account, /verifiedRecoveryExpiry\(jar\.get\("ff-recovery-until"\)\?\.value\)/);
  assert.match(account, /client\.auth\.updateUser\(\{ password \}\)/);
  assert.match(account, /jar\.delete\("ff-recovery-until"\)/);
  assert.ok(account.indexOf("verifiedRecoveryExpiry") < account.indexOf("client.auth.updateUser"), "recovery proof must be verified before the provider mutation");
  assert.ok(account.indexOf("client.auth.updateUser") < account.indexOf('jar.delete("ff-recovery-until")'), "proof must be consumed only after a successful password update");
});
