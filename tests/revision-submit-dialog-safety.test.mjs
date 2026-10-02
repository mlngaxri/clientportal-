import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("revision submit dialog actions never implicitly submit an enclosing form", async () => {
  const source = await readFile("components/RevisionSubmitDialog.tsx", "utf8");
  const buttons = [...source.matchAll(/<button\b[^>]*>/g)].map(([button]) => button);
  assert.equal(buttons.length, 2);
  for (const button of buttons) assert.match(button, /(?:^|\s)type="button"(?:\s|>)/);
});
