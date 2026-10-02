import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("connected acceptance uses the same loopback host as local Supabase auth", async () => {
  const environment = await readFile("scripts/ci-environment.mjs", "utf8");
  const config = await readFile("supabase/config.toml", "utf8");
  const appUrl = environment.match(/APP_URL:\s*"([^"]+)"/)?.[1];
  const siteUrl = config.match(/site_url\s*=\s*"([^"]+)"/)?.[1];
  assert.ok(appUrl, "acceptance APP_URL must be explicit");
  assert.ok(siteUrl, "local Supabase site_url must be explicit");
  assert.equal(new URL(appUrl).hostname, new URL(siteUrl).hostname);
  assert.equal(new URL(appUrl).port, new URL(siteUrl).port);
});
