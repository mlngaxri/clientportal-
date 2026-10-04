import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/api/checkout/route.ts", "utf8");

test("checkout creation never reports provider success without a redirect URL", () => {
  const bind = source.indexOf('admin().rpc("bind_checkout"');
  const guard = source.indexOf('if (!session.url) throw new Error("Checkout provider did not return a redirect URL.")');
  const response = source.lastIndexOf("return Response.json({ url: session.url })");
  assert.ok(bind >= 0, "created sessions must still be bound to the reservation");
  assert.ok(guard > bind, "missing provider URLs must fail after binding the created session");
  assert.ok(response > guard, "success must only be returned after the provider URL is proven present");
});
