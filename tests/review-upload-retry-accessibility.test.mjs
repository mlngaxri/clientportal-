import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../components/Review.tsx", import.meta.url), "utf8");

test("Review attachment chooser stays mounted and retryable after selection", () => {
  assert.match(source, /<label className="upload-label">Attach a file<input type="file"/);
  assert.match(source, /e\.currentTarget\.value = ""; if \(f\) void replacement\(f, undefined\)/);
  assert.doesNotMatch(source, /<input type="file"[^>]*disabled=/);
});

test("Review upload failures preserve Directions and announce a retry path", () => {
  assert.match(source, /Your existing Directions are preserved; choose the file again to retry\./);
  assert.match(source, /\{message && <p role="alert">\{message\}<\/p>\}/);
});
