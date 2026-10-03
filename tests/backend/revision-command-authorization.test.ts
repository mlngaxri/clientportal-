import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";

async function database() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('app_metadata',jsonb_build_object('role',current_setting('test.role',true)))$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`);
  for (const migration of (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
  }
  return db;
}

test("customer revision commands are authenticated and owner-scoped", async () => {
  const db = await database();
  const owner = randomUUID();
  const unrelated = randomUUID();
  const project = randomUUID();
  const commandKey = randomUUID();
  await db.query("insert into auth.users(id) values($1),($2)", [owner, unrelated]);
  await db.query("insert into projects(id,owner_id,phase) values($1,$2,'BUILDING')", [project, owner]);

  const privileges = (await db.query<{ anon: boolean; authenticated: boolean }>(`select has_function_privilege('anon','public.project_command(uuid,text,jsonb,integer,uuid)','EXECUTE') as anon, has_function_privilege('authenticated','public.project_command(uuid,text,jsonb,integer,uuid)','EXECUTE') as authenticated`)).rows[0];
  assert.equal(privileges.anon, false);
  assert.equal(privileges.authenticated, true);

  await db.query("select set_config('test.uid',$1,false)", [unrelated]);
  await assert.rejects(
    () => db.query("select project_command($1,'submit_revision','{}'::jsonb,0,$2)", [project, commandKey]),
    /Only the project owner can manage revision submissions/,
  );
  const receipt = (await db.query<{ count: number }>("select count(*)::int as count from commands where project_id=$1 and key=$2", [project, commandKey])).rows[0];
  assert.equal(receipt.count, 0, "an unauthorized revision command must not persist a command receipt");
  await db.close();
});
