import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("public State rendering requires current Pro entitlement and preserves the release snapshot", async () => {
  const source = await readFile("lib/site/public.ts", "utf8");

  assert.match(source, /if \(project\.pro && !review\) \{/);
  assert.match(source, /from\("state_releases"\)\.select\("states"\)\.eq\("project_id", id\)\.maybeSingle\(\)/);
  assert.match(source, /evaluateStates\(states, new Date\(\), content\.fields\)\.content/);
  assert.doesNotMatch(source, /from\("state_releases"\)\.(?:delete|update|upsert|insert)\(/);
});
