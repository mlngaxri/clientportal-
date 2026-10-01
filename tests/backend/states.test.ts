import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateStates,
  stateActive,
  validateState,
  type ScheduledState,
} from "../../lib/states";

const dinner: ScheduledState = {
  id: "dinner",
  title: "Dinner",
  enabled: true,
  timezone: "Australia/Brisbane",
  days: [5],
  start: "17:00",
  end: "23:00",
  priority: 10,
  overrides: { heading: "Dinner tonight" },
};

test("overnight schedules belong to the day service starts", () => {
  const overnight = { ...dinner, start: "22:00", end: "02:00" };
  assert.equal(stateActive(overnight, new Date("2026-10-02T13:00:00Z")), true);
  assert.equal(stateActive(overnight, new Date("2026-10-02T15:00:00Z")), true);
  assert.equal(stateActive(overnight, new Date("2026-10-03T03:00:00Z")), false);
});

test("equal-priority conflicting overrides fail closed to base content", () => {
  const competing = {
    ...dinner,
    id: "event",
    title: "Event",
    overrides: { heading: "Special event" },
  };
  const result = evaluateStates(
    [dinner, competing],
    new Date("2026-10-02T09:00:00Z"),
    { heading: "Usual heading" },
  );
  assert.equal(result.content.heading, "Usual heading");
  assert.deepEqual(result.conflicts, ["heading"]);
});

test("higher priority wins deterministically", () => {
  const event = {
    ...dinner,
    id: "event",
    title: "Event",
    priority: 20,
    overrides: { heading: "Special event" },
  };
  const result = evaluateStates(
    [dinner, event],
    new Date("2026-10-02T09:00:00Z"),
    { heading: "Usual heading" },
  );
  assert.equal(result.content.heading, "Special event");
  assert.deepEqual(result.activeIds, ["event", "dinner"]);
  assert.deepEqual(result.conflicts, []);
});

test("invalid schedules and prototype-like override keys are rejected", () => {
  assert.ok(validateState({ ...dinner, timezone: "Not/AZone" }).length);
  assert.ok(validateState({ ...dinner, days: [5, 5] }).length);
  assert.ok(validateState({ ...dinner, start: "25:00" }).length);
  assert.ok(
    validateState({
      ...dinner,
      overrides: Object.fromEntries([["constructor", "unsafe"]]),
    }).length,
  );
});


test("database migration enforces the State payload contract", async () => {
  const sql = await readFile("supabase/migrations/011_states_contract.sql", "utf8");
  assert.match(sql, /create trigger boards_states_contract/i);
  assert.match(sql, /valid_states_payload/);
  assert.match(sql, /jsonb_array_length\(doc->'states'\) > 100/);
  assert.match(sql, /Invalid State schedule payload/);
});
