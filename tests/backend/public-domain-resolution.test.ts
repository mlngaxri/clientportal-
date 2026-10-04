import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";

async function database() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`);
  for (const migration of (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort()) await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
  return db;
}

test("public domain resolution exposes only connected launch/live projects", async () => {
  const db = await database();
  const owner = randomUUID();
  const draft = randomUUID(), launch = randomUUID(), live = randomUUID();
  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query("insert into projects(id,owner_id,phase) values($1,$4,'BUILDING'),($2,$4,'LAUNCH'),($3,$4,'LIVE')", [draft, launch, live, owner]);
  await db.query(`insert into site_domains(hostname,project_id,status) values
    ('draft.example.test',$1,'connected'),
    ('launch.example.test',$2,'connected'),
    ('live.example.test',$3,'connected'),
    ('owned.example.test',$3,'owned')`, [draft, launch, live]);

  const privileges = (await db.query<{ anon: boolean; authenticated: boolean; service_role: boolean }>(`select
    has_function_privilege('anon','public.resolve_public_domain(text)','EXECUTE') as anon,
    has_function_privilege('authenticated','public.resolve_public_domain(text)','EXECUTE') as authenticated,
    has_function_privilege('service_role','public.resolve_public_domain(text)','EXECUTE') as service_role`)).rows[0];
  assert.equal(privileges.anon, true);
  assert.equal(privileges.authenticated, false);
  assert.equal(privileges.service_role, true);

  const resolve = async (host: string) => (await db.query<{ project_id: string | null }>("select resolve_public_domain($1) as project_id", [host])).rows[0].project_id;
  assert.equal(await resolve("DRAFT.EXAMPLE.TEST"), null);
  assert.equal(await resolve("owned.example.test"), null);
  assert.equal(await resolve("LAUNCH.EXAMPLE.TEST"), launch);
  assert.equal(await resolve("live.example.test"), live);
  assert.equal(await resolve("missing.example.test"), null);
  await db.close();
});
