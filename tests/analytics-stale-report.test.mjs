import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("analytics clears stale report data before a refreshed request", async () => {
  const source = await readFile("components/AnalyticsWorkspace.tsx", "utf8");
  assert.match(source, /setError\(""\); setLoading\(true\); setData\(null\);/);
  assert.match(source, /\{data && !loading && \(<>/);
});
