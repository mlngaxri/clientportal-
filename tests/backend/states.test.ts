import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { evaluateStates, validateStateCollection } from "../../lib/states.ts";

const base = { hero_title: "Base", hero_body: "Body" };

function state(overrides: Record<string, string>, extra: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    name: "State",
    enabled: true,
    priority: 1,
    timezone: "Australia/Brisbane",
    days: [1, 2, 3, 4, 5, 6, 0],
    start: "00:00",
    end: "23:59",
    overrides,
    ...extra,
  };
}

test("overnight schedules belong to the day service starts", () => {
  const saturdayOnly = state({ hero_title: "Open late" }, { days: [6], start: "22:00", end: "02:00" });
  const saturdayNight = new Date("2026-09-05T13:00:00Z"); // 23:00 Saturday Brisbane
  const sundayEarly = new Date("2026-09-05T15:00:00Z"); // 01:00 Sunday Brisbane
  const sundayNight = new Date("2026-09-06T13:00:00Z"); // 23:00 Sunday Brisbane
  assert.equal(evaluateStates([saturdayOnly] as never, saturdayNight, base).content.hero_title, "Open late");
  assert.equal(evaluateStates([saturdayOnly] as never, sundayEarly, base).content.hero_title, "Open late");
  assert.equal(evaluateStates([saturdayOnly] as never, sundayNight, base).content.hero_title, "Base");
});

test("equal-priority conflicting overrides fail closed to base content", () => {
  const now = new Date("2026-09-07T00:00:00Z");
  const a = state({ hero_title: "A" });
  const b = state({ hero_title: "B" });
  const result = evaluateStates([a, b] as never, now, base);
  assert.equal(result.content.hero_title, "Base");
  assert.deepEqual(result.conflicts, ["hero_title"]);
});

test("higher priority wins deterministically", () => {
  const now = new Date("2026-09-07T00:00:00Z");
  const low = state({ hero_title: "Low" }, { priority: 1 });
  const high = state({ hero_title: "High" }, { priority: 2 });
  const result = evaluateStates([low, high] as never, now, base);
  assert.equal(result.content.hero_title, "High");
  assert.deepEqual(result.conflicts, []);
});

test("invalid schedules and prototype-like override keys are rejected", () => {
  const invalidZone = state({ hero_title: "X" }, { timezone: "Mars/Olympus" });
  assert.equal(validateStateCollection([invalidZone], ["hero_title"]).ok, false);
  const invalidTime = state({ hero_title: "X" }, { start: "25:00" });
  assert.equal(validateStateCollection([invalidTime], ["hero_title"]).ok, false);
  const equalTime = state({ hero_title: "X" }, { start: "09:00", end: "09:00" });
  assert.equal(validateStateCollection([equalTime], ["hero_title"]).ok, false);
  const proto = state({ __proto__: "bad" } as never);
  Object.defineProperty(proto.overrides, "__proto__", { value: "bad", enumerable: true });
  assert.equal(validateStateCollection([proto], ["hero_title"]).ok, false);
});

test("State collection validation fails closed for malformed entries and duplicate IDs", () => {
  const valid = state({ hero_title: "X" });
  assert.equal(validateStateCollection([valid], ["hero_title"]).ok, true);
  assert.equal(validateStateCollection([valid, { ...valid }], ["hero_title"]).ok, false);
  assert.equal(validateStateCollection([null], ["hero_title"]).ok, false);
  assert.equal(validateStateCollection([state({ unknown: "X" })], ["hero_title"]).ok, false);
  assert.equal(validateStateCollection([state({ hero_title: "X" }, { days: [7] })], ["hero_title"]).ok, false);
});

test("database migration enforces the State payload contract", async () => {
  const files = (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql"));
  const sql = (await Promise.all(files.map((name) => readFile(`supabase/migrations/${name}`, "utf8")))).join("\n");
  assert.match(sql, /jsonb_array_length\(days_value\)/i);
  assert.match(sql, /jsonb_object_keys\(overrides_value\)/i);
  assert.match(sql, /invalid state override key/i);
  assert.match(sql, /duplicate state id/i);
});

test("State publication is explicit, version-pinned and idempotent", async () => {
  const [sql, route] = await Promise.all([
    readFile("supabase/migrations/014_state_publication.sql", "utf8"),
    readFile("app/api/projects/[id]/states/route.ts", "utf8"),
  ]);
  assert.match(sql, /create table public\.state_releases/i);
  assert.match(sql, /p\.phase<>'LIVE' or not p\.pro/i);
  assert.match(sql, /b\.version<>expected/i);
  assert.match(sql, /prior\.action<>'activate_states' or prior\.request<>request_value/i);
  assert.match(sql, /on conflict\(project_id\) do update/i);
  assert.match(sql, /insert into commands\(project_id,key,action,result,request\)/i);
  assert.match(route, /activate_state_schedules/);
  assert.match(route, /key: z\.uuid\(\)/);
});

test("public State rendering gates release evaluation on current Pro entitlement", async () => {
  const source = await readFile("lib/site/public.ts", "utf8");
  const proGate = source.indexOf("if (project.pro && !review) {");
  const releaseRead = source.indexOf('.from("state_releases")');
  const evaluation = source.indexOf("evaluateStates(states, new Date(), content.fields)");
  assert.ok(proGate >= 0, "public rendering must gate State evaluation on current Pro entitlement and exclude review mode");
  assert.ok(releaseRead > proGate, "the pinned release must only be read inside the Pro gate");
  assert.ok(evaluation > releaseRead, "State overrides must only be evaluated after the gated release read");
  assert.doesNotMatch(source, /state_releases[\s\S]{0,200}\.delete\(/);
});
