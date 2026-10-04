import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("stale Review canvas selection cannot target a replacement board", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(
    source,
    /onSelect=\{id => \{ if \(boardIdentityRef\.current !== boardIdentity\) return; setSelected\(id\); \}\}/,
    "a late selection callback retained by an obsolete Review canvas must not select a Direction on the replacement Review, even if its id happens to match",
  );
});
