import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Pro analytics comparison stays keyboard-scrollable on narrow layouts", async () => {
  const source = await readFile("components/AnalyticsWorkspace.tsx", "utf8");
  const heading = source.indexOf("<h2>What changed?</h2>");
  const countries = source.indexOf("<h3>Countries</h3>", heading);
  assert.ok(heading >= 0 && countries > heading, "expected the Pro comparison section");
  const comparison = source.slice(heading, countries);
  assert.match(comparison, /role="region"/);
  assert.match(comparison, /aria-label="Analytics period comparison"/);
  assert.match(comparison, /tabIndex=\{0\}/);
  assert.match(comparison, /overflowX: "auto"/);
  assert.match(comparison, /<table className="connected-table">/);
});
