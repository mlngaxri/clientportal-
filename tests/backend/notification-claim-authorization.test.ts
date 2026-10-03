import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

test("notification claiming is service-role only", async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`);
  await db.exec(await readFile("supabase/migrations/001_fourthform.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/007_connected_sites.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/010_notifications.sql", "utf8"));
  await db.exec(await readFile("supabase/migrations/026_notification_claim_privileges.sql", "utf8"));

  const privileges = (await db.query<any>(`select
    has_function_privilege('anon','public.claim_notifications(integer)','execute') anon,
    has_function_privilege('authenticated','public.claim_notifications(integer)','execute') authenticated,
    has_function_privilege('service_role','public.claim_notifications(integer)','execute') service_role`)).rows[0];

  assert.equal(privileges.anon, false);
  assert.equal(privileges.authenticated, false);
  assert.equal(privileges.service_role, true);
  await db.close();
});
