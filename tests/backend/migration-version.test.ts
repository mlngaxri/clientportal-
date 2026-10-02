import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";

const migrationsUrl = new URL("../../supabase/migrations/", import.meta.url);

test("Supabase migrations have unique numeric versions", async () => {
  const migrations = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql"));
  const versions = migrations.map((name) => {
    const match = /^(\d+)_/.exec(name);
    assert.ok(match, `migration ${name} must start with a numeric version`);
    return match[1];
  });

  assert.equal(
    new Set(versions).size,
    versions.length,
    `duplicate Supabase migration version: ${versions.find((version, index) => versions.indexOf(version) !== index)}`,
  );
});
