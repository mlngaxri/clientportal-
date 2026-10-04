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

test("Analytics breakdown tables stay keyboard-scrollable on narrow layouts", async () => {
  const source = await readFile("components/AnalyticsWorkspace.tsx", "utf8");
  const grid = source.indexOf('<div className="connected-grid">');
  const pro = source.indexOf("{data.pro &&", grid);
  assert.ok(grid >= 0 && pro > grid, "expected the analytics breakdown grid");
  const breakdowns = source.slice(grid, pro);
  assert.match(breakdowns, /role="region"/);
  assert.match(breakdowns, /aria-label=\{`\$\{String\(label\)\} analytics table`\}/);
  assert.match(breakdowns, /tabIndex=\{0\}/);
  assert.match(breakdowns, /overflowX: "auto"/);
  assert.match(breakdowns, /<table className="connected-table">/);
});
