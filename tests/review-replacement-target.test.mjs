import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Review replacement uploads retain the target captured by the initiating bridge event", async () => {
  const canvas = await readFile("components/ReviewCanvas.tsx", "utf8");
  assert.match(
    canvas,
    /if \(m\.type === "ff-replace" && m\.file instanceof File\)\s*onReplace\(m\.file, m\.context\);/,
    "the bridge must pass the validated event context with the replacement file",
  );

  const review = await readFile("components/Review.tsx", "utf8");
  const start = review.indexOf("async function replacement");
  const end = review.indexOf("async function command", start);
  assert.ok(start >= 0 && end > start, "expected Review replacement helper");
  const replacement = review.slice(start, end);
  assert.match(replacement, /async function replacement\(file: File, target: BoardObject\["target"\]\)/);
  assert.match(
    replacement,
    /const asset = await uploadAsset[\s\S]*?add\(\{[\s\S]*?target\s*\}\);/,
    "upload completion must add the Direction against the target argument captured when upload began",
  );
  assert.doesNotMatch(
    replacement,
    /\bcontext\b/,
    "replacement must not consult mutable current Review context after the upload resolves",
  );
});
