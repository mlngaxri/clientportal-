import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("origin checks accept the configured public origin without trusting arbitrary origins", async () => {
  const source = await readFile("lib/server.ts", "utf8");
  assert.match(source, /configuredOrigin = new URL\(process\.env\.APP_URL\)\.origin/);
  assert.match(source, /origin !== requestOrigin && origin !== configuredOrigin/);
  assert.match(source, /if \(!origin \|\|/);
});
