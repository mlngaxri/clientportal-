import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("lib/site/public.ts", "utf8");

test("public State overrides are gated by current Pro entitlement and public rendering", () => {
  assert.match(source, /if \(project\.pro && !review\) \{/);
  assert.match(source, /from\("state_releases"\)/);
  assert.match(source, /const states = \(release\?\.states \|\| \[\]\)/);
  assert.match(source, /evaluateStates\(states, new Date\(\), content\.fields\)\.content/);
  assert.doesNotMatch(source, /review \? \[\] : release\?\.states/);
  assert.doesNotMatch(source, /else\s*\{[^}]*state_releases/s);
});
