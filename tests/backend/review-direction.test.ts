import test from "node:test";
import assert from "node:assert/strict";
import { incompleteDirections, isDirectionComplete } from "../../lib/review-direction";
import type { BoardObject } from "../../lib/model";

const direction = (patch: Partial<BoardObject> = {}): BoardObject => ({
  id: crypto.randomUUID(),
  type: "text",
  text: "",
  ...patch,
});

test("target-only and whitespace-only Directions stay incomplete", () => {
  assert.equal(isDirectionComplete(direction({ text: "   " })), false);
  assert.equal(
    isDirectionComplete(
      direction({
        target: { page: "/", width: 1024, scroll: 0, selector: "#hero" },
      }),
    ),
    false,
  );
});

test("customer intent can be prose, a committed asset, a drawing, or a valid link", () => {
  assert.equal(isDirectionComplete(direction({ text: "Make this quieter" })), true);
  assert.equal(
    isDirectionComplete(
      direction({ type: "image", assetId: crypto.randomUUID(), text: "" }),
    ),
    true,
  );
  assert.equal(
    isDirectionComplete(
      direction({
        type: "drawing",
        strokes: [{ id: "s", type: "rect", points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }],
      }),
    ),
    true,
  );
  assert.equal(
    isDirectionComplete(direction({ type: "link", url: "https://example.com" })),
    true,
  );
  assert.equal(
    isDirectionComplete(direction({ type: "link", url: "javascript:alert(1)" })),
    false,
  );
});

test("incompleteDirections returns only unfinished draft items", () => {
  const empty = direction();
  const complete = direction({ text: "Change the heading" });
  assert.deepEqual(incompleteDirections([empty, complete]).map((item) => item.id), [empty.id]);
});
