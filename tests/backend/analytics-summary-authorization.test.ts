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

test("analytics summary is authenticated, project-scoped, and rejects invalid ranges", async () => {
  const db = await database();
  const owner = randomUUID(), outsider = randomUUID(), project = randomUUID();
  await db.query("insert into auth.users(id) values($1),($2)", [owner, outsider]);
  await db.query("insert into projects(id,owner_id) values($1,$2)", [project, owner]);

  const privileges = (await db.query<{ anon: boolean; authenticated: boolean }>(`select has_function_privilege('anon','public.analytics_summary(uuid,integer)','EXECUTE') as anon, has_function_privilege('authenticated','public.analytics_summary(uuid,integer)','EXECUTE') as authenticated`)).rows[0];
  assert.equal(privileges.anon, false);
  assert.equal(privileges.authenticated, true);

  await db.query("select set_config('test.uid',$1,false)", [outsider]);
  await assert.rejects(() => db.query("select analytics_summary($1,7)", [project]), /Project not found or access denied/);

  await db.query("select set_config('test.uid',$1,false)", [owner]);
  await assert.rejects(() => db.query("select analytics_summary($1,$2::integer)", [project, null]), /Invalid analytics range/);
  await assert.rejects(() => db.query("select analytics_summary($1,14)", [project]), /Invalid analytics range/);
  await assert.rejects(() => db.query("select analytics_summary($1,2147483647)", [project]), /Invalid analytics range/);

  const summary = (await db.query<{ analytics_summary: { views: number; visitors: number; actions: number; forms: number; pro: boolean } }>("select analytics_summary($1,7) as analytics_summary", [project])).rows[0].analytics_summary;
  assert.equal(Number(summary.views), 0);
  assert.equal(Number(summary.visitors), 0);
  assert.equal(Number(summary.actions), 0);
  assert.equal(Number(summary.forms), 0);
  assert.equal(summary.pro, false);
  await db.close();
});
