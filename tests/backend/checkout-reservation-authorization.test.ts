import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

test("checkout reservations are owner-scoped and authenticated-only", async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`);
  await db.exec(await readFile("supabase/migrations/001_fourthform.sql", "utf8"));

  const owner = randomUUID();
  const stranger = randomUUID();
  const project = randomUUID();
  await db.query("insert into auth.users(id) values($1),($2)", [owner, stranger]);
  await db.query("insert into projects(id,owner_id,phase) values($1,$2,'AWAITING_INITIAL_PAYMENT')", [project, owner]);

  const privileges = (await db.query<any>(`select
    has_function_privilege('anon','public.reserve_checkout(uuid,text)','execute') anon,
    has_function_privilege('authenticated','public.reserve_checkout(uuid,text)','execute') authenticated`)).rows[0];
  assert.equal(privileges.anon, false);
  assert.equal(privileges.authenticated, true);

  await db.query("select set_config('test.uid',$1,false)", [stranger]);
  await assert.rejects(
    () => db.query("select reserve_checkout($1,'initial')", [project]),
    /Access denied/,
  );
  assert.equal((await db.query<any>("select count(*)::int n from checkout_intents")).rows[0].n, 0);

  await db.query("select set_config('test.uid',$1,false)", [owner]);
  const reservation = (await db.query<any>("select reserve_checkout($1,'initial') r", [project])).rows[0].r;
  assert.equal(reservation.project_id, project);
  assert.equal(reservation.kind, "initial");
  assert.equal((await db.query<any>("select count(*)::int n from checkout_intents")).rows[0].n, 1);

  await db.close();
});
