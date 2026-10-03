import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Review canvas actions never implicitly submit an enclosing form", async () => {
  const source = await readFile("components/ReviewCanvas.tsx", "utf8");
  const buttons = [...source.matchAll(/<button\b[^>]*>/g)].map(([button]) => button);
  assert.ok(buttons.length >= 2, "expected Review canvas button templates");
  for (const button of buttons) assert.match(button, /(?:^|\s)type="button"(?:\s|>)/);
});
