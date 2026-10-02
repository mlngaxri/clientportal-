import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("revision submission exposes asynchronous progress to assistive technology", async () => {
  const source = await readFile("components/RevisionSubmitDialog.tsx", "utf8");
  assert.match(source, /busy && <p role="status" aria-live="polite">Submitting revision…<\/p>/);
  assert.match(source, /disabled=\{!ack \|\| busy\}/);
});
