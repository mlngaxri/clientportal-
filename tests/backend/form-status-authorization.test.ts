import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('app_metadata',jsonb_build_object('role',current_setting('test.role',true)))$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`,
);
for (const migration of (await readdir("supabase/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()) {
  await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
}

const owner = randomUUID();
const other = randomUUID();
const project = randomUUID();
const submission = randomUUID();
await db.query("insert into auth.users(id) values($1),($2)", [owner, other]);
await db.query("insert into projects(id,owner_id) values($1,$2)", [project, owner]);
await db.query(
  "insert into form_submissions(id,project_id,page_id,name,email,message) values($1,$2,'home','Customer','customer@example.com','A private enquiry')",
  [submission, project],
);

await db.query("select set_config('test.uid',$1,false)", [other]);
await db.exec("set role authenticated");
await assert.rejects(
  () => db.query("select set_form_status($1,$2,'archived')", [project, submission]),
  /access denied/,
);
await db.exec("reset role");
const unchanged = await db.query<{ status: string }>(
  "select status from form_submissions where id=$1",
  [submission],
);
assert.equal(unchanged.rows[0]?.status, "new");

await db.query("select set_config('test.uid',$1,false)", [owner]);
await db.exec("set role authenticated");
await db.query("select set_form_status($1,$2,'read')", [project, submission]);
await db.exec("reset role");
const changed = await db.query<{ status: string }>(
  "select status from form_submissions where id=$1",
  [submission],
);
assert.equal(changed.rows[0]?.status, "read");

console.log("form status authorization assertions passed");
await db.close();
