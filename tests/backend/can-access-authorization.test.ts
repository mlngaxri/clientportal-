import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

test("can_access is executable only by authenticated customer sessions", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role;");
    await db.exec(`
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
      create table public.projects(id uuid primary key, owner_id uuid not null);
      create function public.is_operator() returns boolean language sql stable as $$ select false $$;
      create function public.can_access(pid uuid) returns boolean language sql stable security definer set search_path=public as $$
        select exists(select 1 from projects where id=pid and (owner_id=auth.uid() or public.is_operator()))
      $$;
    `);
    await db.exec(await readFile("supabase/migrations/028_can_access_privileges.sql", "utf8"));

    const privilege = async (role: string) =>
      (await db.query<{ allowed: boolean }>(
        "select has_function_privilege($1, 'public.can_access(uuid)', 'EXECUTE') as allowed",
        [role],
      )).rows[0].allowed;

    assert.equal(await privilege("anon"), false);
    assert.equal(await privilege("authenticated"), true);
    assert.equal(await privilege("service_role"), false);
  } finally {
    await db.close();
  }
});
