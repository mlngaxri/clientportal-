import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("successful Review reattachment consumes the intent and clears its instruction", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  const start = source.indexOf("if (reattach && patch.target) {");
  const end = source.indexOf("} else add(patch);", start);

  assert.notEqual(start, -1, "Review must keep a dedicated successful reattachment branch");
  assert.notEqual(end, -1, "successful reattachment must remain distinct from adding a new Direction");
  const reattachment = source.slice(start, end);
  assert.match(reattachment, /o\.id === reattach \? \{ \.\.\.o, target: patch\.target \} : o/, "reattachment must update only the intended Direction target");
  assert.match(reattachment, /setSelected\(reattach\)/, "reattachment must keep the updated Direction selected");
  assert.match(reattachment, /setReattach\(null\)/, "reattachment must consume reattachment mode");
  assert.match(reattachment, /setMessage\(""\)/, "reattachment must remove the stale click instruction");
  assert.match(reattachment, /setAnnouncement\("Direction reattached to the new website location\."\)/, "reattachment must announce successful recovery");
});
