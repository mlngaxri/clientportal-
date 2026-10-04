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

test("project command wrapper rejects unrelated authenticated callers without side effects", async () => {
  const db = await database();
  const owner = randomUUID(), unrelated = randomUUID(), project = randomUUID(), key = randomUUID();
  await db.query("insert into auth.users(id) values($1),($2)", [owner, unrelated]);
  await db.query("insert into projects(id,owner_id) values($1,$2)", [project, owner]);

  const privileges = (await db.query<{ anon: boolean; authenticated: boolean }>(`select has_function_privilege('anon','public.project_command(uuid,text,jsonb,integer,uuid)','EXECUTE') as anon, has_function_privilege('authenticated','public.project_command(uuid,text,jsonb,integer,uuid)','EXECUTE') as authenticated`)).rows[0];
  assert.equal(privileges.anon, false);
  assert.equal(privileges.authenticated, true);

  await db.query("select set_config('test.uid',$1,false)", [unrelated]);
  await assert.rejects(() => db.query("select project_command($1,'invalid',$2::jsonb,1,$3)", [project, "{}", key]), /Project not found or access denied/);
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from commands where project_id=$1", [project])).rows[0].count, 0);
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from audit_events where project_id=$1", [project])).rows[0].count, 0);

  await db.query("select set_config('test.uid',$1,false)", [owner]);
  await assert.rejects(() => db.query("select project_command($1,'invalid',$2::jsonb,1,$3)", [project, "{}", key]), (error: Error) => !/Project not found or access denied/.test(error.message));
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from commands where project_id=$1", [project])).rows[0].count, 0);
  await db.close();
});
