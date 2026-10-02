import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("billing actions cannot submit an enclosing form", async () => {
  const source = await readFile("components/BillingWorkspace.tsx", "utf8");
  const buttons = source.match(/<button\b/g) ?? [];
  const safeButtons = source.match(/<button(?:\s|\n)+type="button"/g) ?? [];
  assert.ok(buttons.length > 0);
  assert.equal(safeButtons.length, buttons.length);
});
