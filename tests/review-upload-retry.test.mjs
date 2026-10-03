import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Review attachment input permits retrying the same file after upload failure", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  const start = source.indexOf('<input type="file"');
  const end = source.indexOf("</label>", start);
  assert.ok(start >= 0 && end > start, "expected Review attachment file input");
  const input = source.slice(start, end);
  assert.match(input, /const f = e\.currentTarget\.files\?\.\[0\]/);
  assert.match(input, /e\.currentTarget\.value = ""/);
  assert.ok(input.indexOf('e.currentTarget.value = ""') < input.indexOf("if (f) void replacement"), "input should reset before upload starts");
});

test("successful Review upload clears a stale retry error", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  const start = source.indexOf("async function replacement");
  const end = source.indexOf("async function command", start);
  assert.ok(start >= 0 && end > start, "expected Review replacement helper");
  const replacement = source.slice(start, end);
  assert.match(replacement, /const asset = await uploadAsset[\s\S]*?add\([\s\S]*?setMessage\(""\);[\s\S]*?catch/);
  assert.match(replacement, /catch[\s\S]*?setMessage\(`\$\{\(e as Error\)\.message\}/);
});
