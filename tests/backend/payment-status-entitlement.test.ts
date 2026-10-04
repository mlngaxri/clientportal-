import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("payment status treats every entitled Pro subscription state as confirmed", async () => {
  const route = await readFile("app/api/projects/[id]/payment-status/route.ts", "utf8");
  const entitlement = await readFile("supabase/migrations/019_subscription_trial_entitlement.sql", "utf8");

  assert.match(entitlement, /status in \('active','trialing'\)/);
  assert.match(route, /\["active", "trialing"\]\.includes\(result\.data\.status\)/);
  assert.ok(
    route.indexOf('["active", "trialing"].includes(result.data.status)') <
      route.indexOf("stripe().checkout.sessions.retrieve"),
    "persisted entitled states must confirm before falling back to Stripe polling",
  );
});
