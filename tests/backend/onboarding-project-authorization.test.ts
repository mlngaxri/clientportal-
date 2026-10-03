import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";

async function database() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('app_metadata',jsonb_build_object('role',current_setting('test.role',true)))$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`);
  for (const migration of (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort()) await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
  return db;
}

test("onboarding project creation is authenticated, owner-bound, and retry-safe", async () => {
  const db = await database();
  const owner = randomUUID(), unrelated = randomUUID(), key = randomUUID();
  await db.query("insert into auth.users(id) values($1),($2)", [owner, unrelated]);

  const privileges = (await db.query<{ anon: boolean; authenticated: boolean }>(`select has_function_privilege('anon','public.create_onboarding_project(uuid)','EXECUTE') as anon, has_function_privilege('authenticated','public.create_onboarding_project(uuid)','EXECUTE') as authenticated`)).rows[0];
  assert.equal(privileges.anon, false);
  assert.equal(privileges.authenticated, true);

  await db.query("select set_config('test.uid',$1,false)", [owner]);
  const first = (await db.query<{ value: { id: string; owner_id: string } }>("select create_onboarding_project($1) as value", [key])).rows[0].value;
  assert.equal(first.owner_id, owner);

  const retry = (await db.query<{ value: { id: string } }>("select create_onboarding_project($1) as value", [key])).rows[0].value;
  assert.equal(retry.id, first.id);
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from projects where owner_id=$1", [owner])).rows[0].count, 1);

  await db.query("select set_config('test.uid',$1,false)", [unrelated]);
  await assert.rejects(() => db.query("select create_onboarding_project($1)", [key]), /Project not found or access denied/);
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from projects where owner_id=$1", [unrelated])).rows[0].count, 0);
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from onboarding_requests where key=$1 and owner_id=$2", [key, owner])).rows[0].count, 1);
  await db.close();
});
