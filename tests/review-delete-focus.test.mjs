import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("deleting the selected Review Direction restores keyboard focus", async () => {
  const source = await readFile("components/Review.tsx", "utf8");

  assert.match(
    source,
    /const addDirectionButton = useRef<HTMLButtonElement>\(null\);/,
    "Review must retain a stable focus target outside the deleted Direction",
  );
  assert.match(
    source,
    /<button ref=\{addDirectionButton\} type="button" aria-label="Add Direction"/,
    "the focus target must be the visible Add Direction control",
  );
  assert.match(
    source,
    /editor\.removeObjects\(\[obj\.id\]\); setSelected\(null\); requestAnimationFrame\(\(\) => addDirectionButton\.current\?\.focus\(\)\);/,
    "Delete must move focus after the selected Direction is removed",
  );
});
