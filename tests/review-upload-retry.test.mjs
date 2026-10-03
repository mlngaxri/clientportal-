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
  assert.ok(
    input.indexOf('e.currentTarget.value = ""') < input.indexOf("replacement(f, undefined)"),
    "file input must reset before asynchronous replacement so the same file can be selected again",
  );
});
