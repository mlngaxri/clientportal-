import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

async function commerceDb() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`);
  for (const file of ["001_fourthform.sql", "004_commerce_hardening.sql", "021_checkout_rotation_fail_closed.sql", "022_checkout_binding_expiry.sql"])
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  return db;
}

test("checkout rotation fails closed for a stale reservation key", async () => {
  const db = await commerceDb();
  const owner = randomUUID(), project = randomUUID();
  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query("insert into projects(id,owner_id,phase) values($1,$2,'AWAITING_INITIAL_PAYMENT')", [project, owner]);
  await db.query("select set_config('test.uid',$1,false)", [owner]);
  const reservation = (await db.query<any>("select reserve_checkout($1,'initial') r", [project])).rows[0].r;
  await db.query("select bind_checkout($1,'initial',$2,'cs_original')", [project, reservation.key]);

  const staleKey = randomUUID();
  await assert.rejects(
    () => db.query("select rotate_checkout($1,'initial',$2)", [project, staleKey]),
    /Checkout reservation mismatch/,
  );
  const before = (await db.query<any>("select key,session_id from checkout_intents where project_id=$1 and kind='initial'", [project])).rows[0];
  assert.equal(before.key, reservation.key);
  assert.equal(before.session_id, "cs_original");

  await db.query("select rotate_checkout($1,'initial',$2)", [project, reservation.key]);
  const after = (await db.query<any>("select key,session_id from checkout_intents where project_id=$1 and kind='initial'", [project])).rows[0];
  assert.notEqual(after.key, reservation.key);
  assert.equal(after.session_id, null);
  await db.close();
});

test("expired unbound checkout reservations cannot be attached to provider sessions", async () => {
  const db = await commerceDb();
  const owner = randomUUID(), project = randomUUID();
  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query("insert into projects(id,owner_id,phase) values($1,$2,'AWAITING_INITIAL_PAYMENT')", [project, owner]);
  await db.query("select set_config('test.uid',$1,false)", [owner]);
  const reservation = (await db.query<any>("select reserve_checkout($1,'initial') r", [project])).rows[0].r;
  await db.query("update checkout_intents set expires_at=now()-interval '1 second' where project_id=$1 and kind='initial'", [project]);

  await assert.rejects(
    () => db.query("select bind_checkout($1,'initial',$2,'cs_expired')", [project, reservation.key]),
    /Checkout reservation mismatch/,
  );
  const expired = (await db.query<any>("select session_id from checkout_intents where project_id=$1 and kind='initial'", [project])).rows[0];
  assert.equal(expired.session_id, null);

  await db.query("select rotate_checkout($1,'initial',$2)", [project, reservation.key]);
  const fresh = (await db.query<any>("select key from checkout_intents where project_id=$1 and kind='initial'", [project])).rows[0];
  await db.query("select bind_checkout($1,'initial',$2,'cs_fresh')", [project, fresh.key]);
  await db.query("update checkout_intents set expires_at=now()-interval '1 second' where project_id=$1 and kind='initial'", [project]);
  await db.query("select bind_checkout($1,'initial',$2,'cs_fresh')", [project, fresh.key]);
  const rebound = (await db.query<any>("select session_id from checkout_intents where project_id=$1 and kind='initial'", [project])).rows[0];
  assert.equal(rebound.session_id, "cs_fresh");
  await db.close();
});
