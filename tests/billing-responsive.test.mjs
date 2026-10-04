import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("components/BillingWorkspace.tsx", "utf8");

test("billing payment history remains reachable on narrow layouts", () => {
  const heading = source.indexOf("<h2>Payment history</h2>");
  const emptyState = source.indexOf("No confirmed payments yet.", heading);
  assert.notEqual(heading, -1, "Billing must render the payment history heading");
  assert.notEqual(emptyState, -1, "Billing must retain the payment-history empty state");
  const history = source.slice(heading, emptyState);
  assert.match(history, /role="region"[^>]*aria-label="Payment history"[^>]*tabIndex=\{0\}[^>]*overflowX:\s*"auto"/, "payment history must expose a named, keyboard-focusable horizontal scroll region");
  assert.match(history, /<div[^>]*role="region"[\s\S]*?<table className="connected-table">[\s\S]*?<\/table>[\s\S]*?<\/div>/, "the payment table must remain inside its responsive scroll boundary");
});
