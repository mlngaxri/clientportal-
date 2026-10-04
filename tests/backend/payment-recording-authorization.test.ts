import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

test("record_payment is executable only by the service role", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`,
    );
    await db.exec(await readFile("supabase/migrations/001_fourthform.sql", "utf8"));

    const privilege = async (role: string) =>
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege($1, 'public.record_payment(text,text,uuid,text,integer,text)', 'EXECUTE') allowed",
          [role],
        )
      ).rows[0].allowed;

    assert.equal(await privilege("anon"), false);
    assert.equal(await privilege("authenticated"), false);
    assert.equal(await privilege("service_role"), true);
  } finally {
    await db.close();
  }
});
