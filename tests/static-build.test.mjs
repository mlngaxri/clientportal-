import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
test("standalone build retains ordered scripts and all local assets", async () => {
  execFileSync(process.execPath, ["scripts/build.mjs"]);
  const html = await readFile("dist/index.html", "utf8");
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(
    (x) => x[1],
  );
  assert.ok(scripts.indexOf("portal-model.js") < scripts.indexOf("portal-operations.js"));
  assert.ok(
    scripts.indexOf("portal-reliability.js") <
      scripts.indexOf("portal-communication.js"),
  );
  for (const file of [
    ...scripts,
    ...[...html.matchAll(/<link[^>]*href="([^"]+)"/g)].map((x) => x[1]),
  ]) {
    if (!file.startsWith("http")) await access("dist/" + file);
  }
  assert.ok(!html.includes("fonts.googleapis.com"), "fonts remain local");
  const operations = await readFile("dist/portal-operations.js", "utf8");
  assert.ok(operations.includes("fourthform:reset"));
});
