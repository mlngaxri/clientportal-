import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/api/checkout/route.ts", "utf8");

test("checkout validates its return address before provider or reservation work", () => {
  const config = source.indexOf("const base = process.env.APP_URL");
  const provider = source.indexOf("const s = stripe()");
  const reservation = source.indexOf('client.rpc("reserve_checkout"');

  assert.ok(config >= 0, "checkout must validate APP_URL");
  assert.ok(provider > config, "Stripe must not initialize before APP_URL validation");
  assert.ok(
    reservation > config,
    "checkout reservations must not be created before APP_URL validation",
  );
});
