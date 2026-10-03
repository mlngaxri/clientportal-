import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("successful Review reattachment consumes the intent and clears its instruction", async () => {
  const source = await readFile("components/Review.tsx", "utf8");

  assert.match(
    source,
    /if \(reattach && patch\.target\) \{ update\(d => \(\{ \.\.\.d, objects: d\.objects\.map\(o => o\.id === reattach \? \{ \.\.\.o, target: patch\.target \} : o\) \}\)\); setSelected\(reattach\); setReattach\(null\); setMessage\(""\); \} else add\(patch\);/,
    "a successful website click must update the intended Direction, keep it selected, consume reattachment mode, and remove the stale click instruction",
  );
});
