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

test("site registration is authenticated but operator-only without customer side effects", async () => {
  const db = await database();
  const owner = randomUUID(), operator = randomUUID(), project = randomUUID();
  await db.query("insert into auth.users(id) values($1),($2)", [owner, operator]);
  await db.query("insert into projects(id,owner_id) values($1,$2)", [project, owner]);

  const privileges = (await db.query<{ anon: boolean; authenticated: boolean }>(`select has_function_privilege('anon','public.register_site(uuid,jsonb,jsonb)','EXECUTE') as anon, has_function_privilege('authenticated','public.register_site(uuid,jsonb,jsonb)','EXECUTE') as authenticated`)).rows[0];
  assert.equal(privileges.anon, false);
  assert.equal(privileges.authenticated, true);

  const definition = { pages: [{ id: "home", fields: [] }] };
  const content = { fields: {}, seo: { home: { title: "Home", description: "", noindex: false } } };

  await db.query("select set_config('test.uid',$1,false),set_config('test.role','',false)", [owner]);
  await assert.rejects(() => db.query("select register_site($1,$2::jsonb,$3::jsonb)", [project, JSON.stringify(definition), JSON.stringify(content)]), /Only Fourthform can define a website/);
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from site_documents where project_id=$1", [project])).rows[0].count, 0);
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from project_settings where project_id=$1", [project])).rows[0].count, 0);

  await db.query("select set_config('test.uid',$1,false),set_config('test.role','operator',false)", [operator]);
  await db.query("select register_site($1,$2::jsonb,$3::jsonb)", [project, JSON.stringify(definition), JSON.stringify(content)]);
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from site_documents where project_id=$1", [project])).rows[0].count, 1);
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from project_settings where project_id=$1", [project])).rows[0].count, 1);
  await db.close();
});
