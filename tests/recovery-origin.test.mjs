import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("connected acceptance isolates app PKCE cookies from local Supabase auth", async () => {
  const environment = await readFile("scripts/ci-environment.mjs", "utf8");
  const config = await readFile("supabase/config.toml", "utf8");
  const appUrl = environment.match(/APP_URL:\s*"([^"]+)"/)?.[1];
  const siteUrl = config.match(/site_url\s*=\s*"([^"]+)"/)?.[1];
  const apiPort = config.match(/\[api\][\s\S]*?port\s*=\s*(\d+)/)?.[1];
  assert.ok(appUrl, "acceptance APP_URL must be explicit");
  assert.ok(siteUrl, "local Supabase site_url must be explicit");
  assert.ok(apiPort, "local Supabase API port must be explicit");
  assert.equal(appUrl, siteUrl, "recovery must return to the same app origin that requested it");
  assert.equal(new URL(appUrl).hostname, "localhost", "app auth cookies must stay off the Supabase API host");
  assert.equal(new URL(appUrl).port, "4173");
  assert.notEqual(new URL(appUrl).hostname, "127.0.0.1");
  assert.equal(apiPort, "54321");
});
