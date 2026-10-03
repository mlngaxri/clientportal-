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
    /editor\.removeObjects\(\[obj\.id\]\); setSelected\(null\); setAnnouncement\("Direction deleted\. Focus moved to Add Direction\."\); requestAnimationFrame\(\(\) => addDirectionButton\.current\?\.focus\(\)\);/,
    "Delete must announce the state change and move focus after the selected Direction is removed",
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
