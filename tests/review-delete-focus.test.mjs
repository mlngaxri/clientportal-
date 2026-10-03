import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("deleting the selected Review Direction restores keyboard focus and announces the change", async () => {
  const source = await readFile("components/Review.tsx", "utf8");

  assert.match(
    source,
    /addDirectionButton\s*=\s*useRef<HTMLButtonElement>\(null\)/,
    "Review must retain a stable focus target outside the deleted Direction",
  );
  assert.match(
    source,
    /<button ref=\{addDirectionButton\} type="button" aria-label="Add Direction"/,
    "the focus target must be the visible Add Direction control",
  );
  assert.match(
    source,
    /editor\.removeObjects\(\[obj\.id\]\); setReattach\(\(current\) => current === obj\.id \? null : current\); setSelected\(null\); setAnnouncement\("Direction deleted\. Focus moved to Add Direction\."\); requestAnimationFrame\(\(\) => addDirectionButton\.current\?\.focus\(\)\);/,
    "Delete must cancel reattachment for that Direction, announce the state change, and move focus after removal",
  );
  assert.match(
    source,
    /\{announcement && <p role="status">\{announcement\}<\/p>\}/,
    "Review must expose deletion feedback through a polite live status",
  );
  assert.match(
    source,
    /setAnnouncement\(""\);\s*setSelected\(id\);/,
    "starting a new Direction must clear stale deletion feedback",
  );
});

test("stale Review selection only claims focus movement when Add Direction exists", async () => {
  const source = await readFile("components/Review.tsx", "utf8");

  assert.match(
    source,
    /setAnnouncement\(locked \? "Selected Direction is no longer available\." : "Selected Direction is no longer available\. Focus moved to Add Direction\."\);/,
    "locked Review must not announce focus movement to a control that is not rendered",
  );
  assert.match(
    source,
    /if \(!locked\) requestAnimationFrame\(\(\) => addDirectionButton\.current\?\.focus\(\)\);/,
    "focus recovery must remain limited to draft Review where Add Direction is available",
  );
});

test("stale Review reattachment is canceled when its Direction disappears", async () => {
  const source = await readFile("components/Review.tsx", "utf8");

  assert.match(
    source,
    /if \(!reattach \|\| data\.objects\.some\(\(object\) => object\.id === reattach\)\) return;\s*setReattach\(null\);\s*setAnnouncement\("Reattachment canceled because that Direction is no longer available\."\);/s,
    "acknowledged data removing the reattachment target must cancel the orphaned intent and announce it",
  );
});

test("locking Review cancels active reattachment intent and instruction", async () => {
  const source = await readFile("components/Review.tsx", "utf8");

  assert.match(
    source,
    /if \(!locked \|\| !reattach\) return;\s*setReattach\(null\);\s*setMessage\(""\);\s*setAnnouncement\("Reattachment canceled because this Review is now locked\."\);/s,
    "submitted or otherwise locked Review must cancel reattachment and clear its stale click instruction",
  );
});
