import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(".github/workflows/deploy.yml", "utf8");

test("deployment refuses to run without Vercel credentials", () => {
  assert.match(workflow, /if \[ -z \"\$VERCEL_TOKEN\" \]; then[\s\S]*?exit 1/);
});

test("deployment refuses an obsolete validated SHA", () => {
  assert.match(workflow, /current=\$\(gh api[\s\S]*?if \[ \"\$current\" != \"\$VERIFIED_SHA\" \]; then[\s\S]*?exit 1/);
});

test("build and deploy remain gated on the successful release gate", () => {
  for (const step of [
    "Pull production configuration",
    "Validate connected production configuration",
    "Build the verified release using production configuration",
    "Deploy the exact built release",
  ]) {
    const start = workflow.indexOf(`- name: ${step}`);
    assert.ok(start >= 0, `expected ${step} step`);
    const next = workflow.indexOf("\n      - ", start + 1);
    const block = workflow.slice(start, next < 0 ? undefined : next);
    assert.match(block, /if: steps\.gate\.outputs\.ready == 'true'/, `${step} must fail closed behind the release gate`);
  }
});
