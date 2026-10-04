import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Review reattachment remains cancellable without pointer input", async () => {
  const source = await readFile("components/Review.tsx", "utf8");
  assert.match(source, /reattach === obj\.id \? <button type="button" onClick=\{\(\) => \{ setReattach\(null\); setMessage\(""\); setAnnouncement\("Reattachment canceled\."\); \}\}>Cancel reattachment<\/button>/, "active reattachment must expose a keyboard-operable cancel control that clears its stale instruction and announces cancellation");
  assert.match(source, /setMessage\("Choose the new location on your website to reattach this Direction\."\)/, "reattachment instructions must not imply pointer-only input");
});
