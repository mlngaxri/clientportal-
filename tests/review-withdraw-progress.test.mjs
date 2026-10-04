import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Review withdrawal announces pending work and clears stale errors", async () => {
  const source = await readFile("components/Review.tsx", "utf8");

  assert.match(
    source,
    /onClick=\{\(\) => \{ const startedFor = boardIdentity; setMessage\(""\); setAnnouncement\("Withdrawing revision…"\); void command\("withdraw_revision"\)/,
    "withdrawal must clear a stale command error and announce progress before starting the async command",
  );
  assert.match(
    source,
    /command\("withdraw_revision"\)\.catch\(\(e\) => \{ if \(boardIdentityRef\.current === startedFor\) \{ setAnnouncement\(""\); setMessage\(e\.message\); \} \}\);/,
    "a current-board withdrawal failure must replace pending progress with the actionable error rather than leaving stale busy feedback",
  );
  assert.match(source, /\{announcement && <p role="status">\{announcement\}<\/p>\}/, "withdrawal progress must use the existing polite live status");
  assert.match(source, /\{message && <p role="alert">\{message\}<\/p>\}/, "withdrawal failures must remain assertive alerts");
});
