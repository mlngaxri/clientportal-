import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("connected save conflicts move keyboard focus to recovery guidance", async () => {
  const source = await readFile("components/RecoveryNotice.tsx", "utf8");
  assert.match(source, /const conflictHeading = useRef<HTMLParagraphElement>\(null\)/);
  assert.match(source, /if \(conflict\) conflictHeading\.current\?\.focus\(\)/);
  assert.match(source, /<p id="conflict-heading" role="alert" ref=\{conflictHeading\} tabIndex=\{-1\}>/);
});
