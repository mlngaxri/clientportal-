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
  const styles=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(styles.length,new Set(styles).size,"stylesheets load only once");
  assert.ok(!html.includes("fonts.googleapis.com"), "fonts remain local");
  const recovery = await readFile("dist/portal-reliability.js", "utf8");
  assert.ok(recovery.includes('note.setAttribute("role", "region")'));
  assert.ok(recovery.includes('note.setAttribute("aria-labelledby", heading.id)'));
  assert.ok(recovery.includes("if (!remote) primary.focus()"));

  const operations = await readFile("dist/portal-operations.js", "utf8");
  assert.ok(operations.includes("fourthform:reset"));
});

test("connected route errors announce context before recovery actions", async () => {
  const source = await readFile("app/error.tsx", "utf8");
  assert.match(source, /const heading = useRef<HTMLHeadingElement>\(null\)/);
  assert.match(source, /heading\.current\?\.focus\(\)/);
  assert.match(source, /<h1 ref=\{heading\} tabIndex=\{-1\}>/);
  assert.match(source, />\s*Try again\s*<\/button>/);
});
