import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("recovery conflict announces only its message, not interactive resolution controls", async () => {
  const source = await readFile("components/RecoveryNotice.tsx", "utf8");
  assert.match(source, /<section className="recovery-notice" aria-labelledby="conflict-heading">\s*<p id="conflict-heading" role="alert"[^>]*>/s, "the conflict container must be named while only the conflict message is announced assertively");
  assert.doesNotMatch(source, /<section className="recovery-notice" role="alert">/, "interactive conflict controls must not live inside an assertive alert region");
});
