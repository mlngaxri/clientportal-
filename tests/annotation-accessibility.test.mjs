import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("annotation canvas offers a keyboard creation path", async () => {
  const source = await readFile("components/AnnotationLayer.tsx", "utf8");
  assert.match(source, /function keyboardPlace\(e: React\.KeyboardEvent<SVGSVGElement>\)/);
  assert.match(source, /e\.key !== "Enter" && e\.key !== " "/);
  assert.match(source, /tabIndex=\{readOnly \? undefined : 0\}/);
  assert.match(source, /onKeyDown=\{keyboardPlace\}/);
  assert.match(source, /press Enter or Space to place an annotation in the center/);
  assert.match(source, /setTextPoint\(\{ id: crypto\.randomUUID\(\), type: tool, points: \[center, center\] \}\)/);
  assert.match(source, /onChange\(\[\.\.\.strokes, \{ id: crypto\.randomUUID\(\), type: tool, points \}\]\)/);
});
