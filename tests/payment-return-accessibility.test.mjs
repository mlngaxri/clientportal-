import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("components/PaymentReturn.tsx", "utf8");

test("payment confirmation checks announce progress through the live status", () => {
  assert.match(source, /const status = payment\.checking\s*\n\s*\? "Checking payment confirmation…"/);
  assert.match(source, /<p role="status">\{status\}<\/p>/);
  assert.match(source, /disabled=\{payment\.checking\}/);
});
