import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("daily analytics table stays keyboard-scrollable on narrow layouts", async () => {
  const source = await readFile("components/AnalyticsWorkspace.tsx", "utf8");

  assert.match(source, /<summary>Daily page views as a table<\/summary><div role="region" aria-label="Daily page views table" tabIndex=\{0\} style=\{\{ overflowX: "auto" \}\}>/);
  assert.match(source, /aria-label="Daily page views table"[\s\S]*?<table className="connected-table">/);
});
