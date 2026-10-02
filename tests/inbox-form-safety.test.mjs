import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("inbox actions never submit an enclosing form", async () => {
  const source = await readFile("components/InboxWorkspace.tsx", "utf8");
  const buttons = source.match(/<button\b[\s\S]*?>/g) ?? [];
  assert.ok(buttons.length >= 6, "expected inbox action buttons");
  for (const button of buttons) {
    assert.match(button, /type="button"/, `missing form-safe type on ${button}`);
  }
});
