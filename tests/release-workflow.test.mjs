import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("production deployment fails closed before skipped build or deploy can look successful", async () => {
  const workflow = await readFile(".github/workflows/deploy.yml", "utf8");

  assert.match(workflow, /if \[ -z "\$VERCEL_TOKEN" \]; then[\s\S]*?exit 1/);
  assert.match(workflow, /if \[ "\$current" != "\$VERIFIED_SHA" \]; then[\s\S]*?exit 1/);
  assert.match(workflow, /current=\$\(gh api "repos\/\$GITHUB_REPOSITORY\/git\/ref\/heads\/main" --jq \.object\.sha\)/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(workflow, /vercel build --prod --token="\$VERCEL_TOKEN"/);
  assert.match(workflow, /vercel deploy --prebuilt --prod --token="\$VERCEL_TOKEN"/);

  assert.ok(
    workflow.indexOf("Check configured deployment credentials and current commit") < workflow.indexOf("actions/checkout@"),
    "credential and exact-SHA gates must execute before checkout/build/deploy",
  );
});
