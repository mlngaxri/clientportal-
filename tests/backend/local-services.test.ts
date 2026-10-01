import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeDocuments, parseRecovery } from "../../lib/recovery";
import {
  stateActive,
  evaluateStates,
  validateState,
  type ScheduledState,
} from "../../lib/states";
import {
  SiteService,
  validateContent,
  type SiteAdapter,
  type SiteManifest,
  type PublishedVersion,
} from "../../lib/site/service";
const doc = (text: string) => ({
  objects: [{ id: "a", type: "text" as const, text }],
});
test("recovery validates identity and rejects broken or expired records", () => {
  const r = {
    schema: 1,
    boardId: "b",
    projectId: "p",
    version: 1,
    base: doc("a"),
    data: doc("b"),
    updatedAt: new Date().toISOString(),
  };
  assert.ok(parseRecovery(JSON.stringify(r), "p", "b"));
  assert.equal(parseRecovery(JSON.stringify(r), "other", "b"), null);
  assert.equal(parseRecovery("{broken", "p", "b"), null);
  assert.equal(
    parseRecovery(JSON.stringify({ ...r, updatedAt: "2000-01-01" }), "p", "b"),
    null,
  );
});
test("merge preserves separate edits and detects delete versus edit conflicts", () => {
  const base = { ...doc("a"), title: "one" };
  const merged = mergeDocuments(
    base,
    { ...doc("b"), title: "one" },
    { ...doc("a"), title: "two" },
  );
  assert.deepEqual(merged.conflicts, []);
  assert.equal(merged.data.title, "two");
  assert.equal(merged.data.objects[0].text, "b");
  assert.ok(
    mergeDocuments(base, { objects: [] }, doc("changed")).conflicts.includes(
      "Direction a",
    ),
  );
});
const state: ScheduledState = {
  id: "lunch",
  title: "Lunch",
  enabled: true,
  timezone: "Australia/Brisbane",
  days: [1],
  start: "11:00",
  end: "15:00",
  priority: 0,
  overrides: { heading: "Lunch menu" },
};
test("State boundaries use business timezone and end is exclusive", () => {
  assert.equal(stateActive(state, new Date("2026-09-21T01:00:00Z")), true);
  assert.equal(stateActive(state, new Date("2026-09-21T05:00:00Z")), false);
  assert.equal(stateActive(state, new Date("2026-09-22T01:00:00Z")), false);
});
test("overnight schedules retain the starting weekday", () => {
  assert.equal(
    stateActive(
      { ...state, start: "22:00", end: "02:00" },
      new Date("2026-09-21T15:00:00Z"),
    ),
    true,
  );
});
test("DST repeated local hour is consistently active and invalid zones are rejected", () => {
  const s = {
    ...state,
    timezone: "America/New_York",
    days: [0],
    start: "01:00",
    end: "02:00",
  };
  assert.equal(stateActive(s, new Date("2026-11-01T05:30:00Z")), true);
  assert.equal(stateActive(s, new Date("2026-11-01T06:30:00Z")), true);
  assert.ok(validateState({ ...s, timezone: "invalid" }).length);
});
test("equal priority conflict falls back to base; higher priority resolves it", () => {
  const other = { ...state, id: "special", overrides: { heading: "Special" } };
  const at = new Date("2026-09-21T02:00:00Z");
  assert.deepEqual(
    evaluateStates([state, other], at, { heading: "Usual" }).conflicts,
    ["heading"],
  );
  assert.equal(
    evaluateStates([state, other], at, { heading: "Usual" }).content.heading,
    "Usual",
  );
  assert.equal(
    evaluateStates([state, { ...other, priority: 1 }], at, { heading: "Usual" })
      .content.heading,
    "Special",
  );
});
const manifest: SiteManifest = {
  siteId: "site",
  revision: "1",
  pages: [
    {
      id: "home",
      path: "/",
      title: "Home",
      fields: [{ id: "cta", kind: "link", label: "Booking" }],
    },
  ],
};
test("CMS rejects unknown fields and unsafe link protocols", () => {
  assert.ok(
    validateContent(manifest, {
      fields: { cta: "javascript:alert(1)", unknown: "x" },
      seo: {},
    }).length === 2,
  );
});
test("site publishing requires revision match and a real adapter receipt", async () => {
  let calls = 0;
  const fixture: SiteAdapter = {
    manifest: async () => manifest,
    history: async () => [],
    publish: async (input) => {
      calls++;
      return {
        id: "v1",
        projectId: input.projectId,
        content: input.content,
        deployedAt: new Date().toISOString(),
        url: "https://fixture.invalid",
        adapterReceipt: "",
      } satisfies PublishedVersion;
    },
  };
  const service = new SiteService(fixture);
  await assert.rejects(
    service.publish("p", { fields: {}, seo: {} }, "stale", "key"),
    /changed/,
  );
  assert.equal(calls, 0);
  await assert.rejects(
    service.publish("p", { fields: {}, seo: {} }, "1", "key"),
    /confirm/,
  );
  await assert.rejects(
    service.rollback("p", "foreign", "1", "key"),
    /unavailable/,
  );
});

import { safeReturnPath } from "../../lib/navigation";
test("authentication redirects cannot leave the app", () => {
  for (const input of [
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "/\n/evil.example",
  ])
    assert.equal(safeReturnPath(input), "/start");
  assert.equal(safeReturnPath("/projects/123/review"), "/projects/123/review");
});

import { assertCheckoutEnabled } from '../../lib/release';
test('unfinished products and live payments stay closed by default', () => {
  assert.throws(() => assertCheckoutEnabled({ package: 'SITE', kind: 'initial' }, { STRIPE_SECRET_KEY: 'sk_live_fixture' }), /not open/);
  assert.doesNotThrow(() => assertCheckoutEnabled({ package: 'SITE', kind: 'initial' }, { STRIPE_SECRET_KEY: 'sk_test_fixture' }));
  assert.throws(() => assertCheckoutEnabled({ package: 'FIRST', kind: 'initial' }, {}), /not open/);
  assert.throws(() => assertCheckoutEnabled({ package: 'SITE', kind: 'pro' }, {}), /not open/);
});
