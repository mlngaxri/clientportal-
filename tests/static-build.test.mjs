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

test("connected draft recovery moves keyboard focus to the primary choice", async () => {
  const source = await readFile("components/RecoveryNotice.tsx", "utf8");
  assert.match(source, /const recoveryAction = useRef<HTMLButtonElement>\(null\)/);
  assert.match(source, /if \(recovery\) recoveryAction\.current\?\.focus\(\)/);
  assert.match(source, /aria-labelledby="recovery-heading"/);
  assert.match(source, /<p id="recovery-heading">/);
  assert.match(source, /<button type="button" ref=\{recoveryAction\} onClick=\{recover\}>Restore draft<\/button>/);
});

test("recovery actions cannot submit an enclosing editor form", async () => {
  const source = await readFile("components/RecoveryNotice.tsx", "utf8");
  const buttons = source.match(/<button\b/g) ?? [];
  const safeButtons = source.match(/<button(?:\s|\n)+type="button"/g) ?? [];
  assert.ok(buttons.length > 0);
  assert.equal(safeButtons.length, buttons.length);
});

test("password mismatch identifies the affected fields", async () => {
  const source = await readFile("components/PasswordRecovery.tsx", "utf8");
  assert.match(source, /const passwordMismatch = error === "The passwords do not match\."/);
  assert.equal((source.match(/aria-invalid=\{passwordMismatch \|\| undefined\}/g) ?? []).length, 2);
  assert.equal((source.match(/aria-describedby=\{passwordMismatch \? "password-error" : undefined\}/g) ?? []).length, 2);
  assert.match(source, /<p id="password-error" role="alert">\{error\}<\/p>/);
});

test("timezone field keeps an exact accessible name and separate guidance", async () => {
  const source = await readFile("components/TimezonePicker.tsx", "utf8");
  assert.match(source, /<label htmlFor=\{inputId\}>Business timezone<\/label>/);
  assert.match(source, /<input id=\{inputId\} aria-describedby=\{descriptionId\}/);
  assert.match(source, /<small id=\{descriptionId\}>Use a city timezone\./);
});

test("payment confirmation check cannot submit an enclosing form", async () => {
  const source = await readFile("components/PaymentReturn.tsx", "utf8");
  assert.match(source, /<button type="button" disabled=\{payment\.checking\} onClick=/);
});

test("build history retry cannot submit an enclosing form", async () => {
  const source = await readFile("components/BuildHistory.tsx", "utf8");
  assert.match(source, /<button type="button" onClick=\{\(\) => setAttempt\(\(n\) => n \+ 1\)\}>Try again<\/button>/);
});

test("launch actions cannot submit an enclosing form", async () => {
  const source = await readFile("components/LaunchWorkspace.tsx", "utf8");
  const buttons = source.match(/<button\b/g) ?? [];
  const safeButtons = source.match(/<button(?:\s|\n)+type="button"/g) ?? [];
  assert.ok(buttons.length > 0);
  assert.equal(safeButtons.length, buttons.length);
});

test("annotation tools cannot submit an enclosing review form", async () => {
  const source = await readFile("components/AnnotationLayer.tsx", "utf8");
  const buttons = source.match(/<button\b/g) ?? [];
  const safeButtons = source.match(/<button(?:\s|\n)+type="button"/g) ?? [];
  assert.ok(buttons.length > 0);
  assert.equal(safeButtons.length, buttons.length);
});
