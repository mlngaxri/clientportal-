import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/api/checkout/route.ts", "utf8");

test("checkout validates its return address before provider or reservation work", () => {
  const config = source.indexOf("const configuredBase = process.env.APP_URL");
  const provider = source.indexOf("const s = stripe()");
  const reservation = source.indexOf('client.rpc("reserve_checkout"');

  assert.ok(config >= 0, "checkout must validate APP_URL");
  assert.ok(provider > config, "Stripe must not initialize before APP_URL validation");
  assert.ok(
    reservation > config,
    "checkout reservations must not be created before APP_URL validation",
  );
});

test("checkout permits HTTP return addresses only in development", () => {
  assert.match(
    source,
    /process\.env\.APP_ENV\s*!==\s*"development"[\s\S]*?returnAddress\.protocol\s*!==\s*"https:"/,
    "staging and production checkout callbacks must require HTTPS",
  );
});

test("checkout accepts only an origin as its configured return address", () => {
  for (const component of ["username", "password", "pathname", "search", "hash"])
    assert.match(
      source,
      new RegExp(`returnAddress\\.${component}\\s*!==`),
      `APP_URL must reject a configured ${component}`,
    );
  assert.match(
    source,
    /const base = returnAddress\.origin;/,
    "Stripe return URLs must be built from the parsed canonical origin",
  );
});
