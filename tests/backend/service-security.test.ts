import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { publicAddress, publicHostname } from "../../lib/services/network";
import { verifyEmailWebhook } from "../../lib/services/webhook";
import { analyticsIdentity, ignoreTraffic } from "../../lib/services/analytics";
import { inspectHtml } from "../../lib/services/seo";
test("site inspection excludes internal addresses, ambiguous hostnames and private IPv6", () => {
  for (const host of [
    "127.0.0.1",
    "localhost",
    "internal.local",
    "a.example",
    "https://example.com",
    "a.example.com/",
    "[::1]",
  ])
    assert.throws(() => publicHostname(host));
  assert.equal(publicHostname("Cedar.Example.com"), "cedar.example.com");
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.0.1",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::ffff:127.0.0.1",
    "fd00::1",
    "fe80::1",
    "2001:db8::1",
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress("8.8.8.8"), true);
  assert.equal(publicAddress("2606:4700:4700::1111"), true);
});
test("email events require an authentic raw-body signature and a recent timestamp", () => {
  const secret = `whsec_${Buffer.from("a long webhook fixture key").toString("base64")}`,
    body = JSON.stringify({ type: "email.delivered" }),
    now = Date.now(),
    timestamp = String(Math.floor(now / 1000)),
    id = "msg_fixture";
  const signed = createHmac("sha256", Buffer.from(secret.slice(6), "base64"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  const headers = new Headers({
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${signed}`,
  });
  assert.equal(verifyEmailWebhook(body, headers, secret, now), id);
  assert.throws(() => verifyEmailWebhook(body + " ", headers, secret, now));
  assert.throws(() => verifyEmailWebhook(body, headers, secret, now + 301000));
});
test("analytics retain no raw identity and rotate project-specific daily visitor estimates", () => {
  const secret = "private test key",
    at = new Date("2026-10-01T01:00:00Z"),
    a = analyticsIdentity("203.0.113.5", "Browser", "p", secret, at);
  assert.equal(a.length, 64);
  assert.equal(a, analyticsIdentity("203.0.113.5", "Browser", "p", secret, at));
  assert.notEqual(
    a,
    analyticsIdentity("203.0.113.5", "Browser", "other", secret, at),
  );
  assert.notEqual(
    a,
    analyticsIdentity(
      "203.0.113.5",
      "Browser",
      "p",
      secret,
      new Date("2026-10-02"),
    ),
  );
  assert.equal(ignoreTraffic(new Headers({ "sec-gpc": "1" })), true);
});
test("search inspection reports the delivered HTML rather than invented scores", () => {
  const html =
    '<title>Cedar</title><meta name="description" content="Furniture for everyday living"><meta name="robots" content="index, follow"><link rel="canonical" href="https://cedar.example.com/"><h1>Cedar</h1><img alt="Oak table" src="a.png">';
  assert.ok(
    inspectHtml(html, "https://cedar.example.com/").every(
      (c) => c.status === "pass",
    ),
  );
  assert.ok(
    inspectHtml(html, "https://other.example.com/").some(
      (c) => c.label === "Canonical address" && c.status === "fail",
    ),
  );
});
