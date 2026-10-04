import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../components/PaymentReturn.tsx", import.meta.url), "utf8");

test("payment confirmation polling exposes a truthful timeout recovery state", () => {
  assert.match(source, /\[timedOut, setTimedOut\] = useState\(false\)/);
  assert.match(source, /attempts >= 20\) \{ clearInterval\(timer\); setTimedOut\(true\); return; \}/);
  assert.match(source, /payment\.timedOut && payment\.state === "processing"/);
  assert.match(source, /Payment confirmation is taking longer than expected\. Use Check confirmation to try again before starting another checkout\./);
  assert.match(source, /<p role="status">\{status\}<\/p>/);
});

test("confirmed payments stop the bounded polling loop immediately", () => {
  assert.match(source, /if \(result\.state === "confirmed"\) \{ key\.current = ""; callback\.current\(\); \}/);
  assert.match(source, /if \(!key\.current\) \{ clearInterval\(timer\); return; \}/);
});

test("unmatched payment returns do not expose an enabled no-op confirmation action", () => {
  assert.match(source, /blocked: state === "processing"/);
  assert.doesNotMatch(source, /blocked: \["processing", "unknown"\]\.includes\(state\)/);
  assert.match(source, /unknown: "This checkout could not be matched to a payment\. Check Billing before paying again\./);
});
