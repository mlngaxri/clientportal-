import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("successful Review reattachment consumes the intent and clears its instruction", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  const reattachment = source.match(/if \(reattach && patch\.target\) \{(?<body>.*?)\} else add\(patch\);/s)?.groups?.body;

  assert.ok(reattachment, "Review must keep a dedicated successful reattachment branch");
  assert.match(reattachment, /o\.id === reattach \? \{ \.\.\.o, target: patch\.target \} : o/, "reattachment must update only the intended Direction target");
  assert.match(reattachment, /setSelected\(reattach\)/, "reattachment must keep the updated Direction selected");
  assert.match(reattachment, /setReattach\(null\)/, "reattachment must consume reattachment mode");
  assert.match(reattachment, /setMessage\(""\)/, "reattachment must remove the stale click instruction");
});
