import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("analytics Pro controls are scoped to the project that proved entitlement", async () => {
  const source = await readFile("components/AnalyticsWorkspace.tsx", "utf8");
  assert.match(source, /\[proProject, setProProject\] = useState<string \| null>\(null\)/);
  assert.match(source, /const pro = proProject === projectId;/);
  assert.match(source, /setProProject\(d\.pro \? projectId : null\)/);
  assert.doesNotMatch(source, /\[pro, setPro\] = useState\(false\)/);
});
