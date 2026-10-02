import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";

async function database() {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('app_metadata',jsonb_build_object('role',current_setting('test.role',true)))$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`,
  );
  for (const migration of (await readdir("supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
  }
  return db;
}

const data = (object: Record<string, unknown>) => JSON.stringify({ objects: [object] });

test("send_initial rejects semantically empty Directions without a command receipt", async () => {
  const db = await database();
  const owner = randomUUID();
  const project = randomUUID();
  const commandKey = randomUUID();
  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query("insert into projects(id,owner_id,phase) values($1,$2,'DIRECTION')", [project, owner]);
  const board = (
    await db.query<{ id: string }>(
      "insert into boards(project_id,kind,data) values($1,'initial',$2) returning id",
      [project, data({ id: "empty", type: "text", text: "   ", target: { page: "/" } })],
    )
  ).rows[0];
  await db.query("select set_config('test.uid',$1,false)", [owner]);

  await assert.rejects(
    () => db.query("select project_command($1,'send_initial',$2::jsonb,0,$3)", [project, JSON.stringify({ boardId: board.id }), commandKey]),
    /initial_submission_requires_complete_directions/,
  );

  const persisted = (
    await db.query<{ status: string; submitted_data: unknown; version: number }>(
      "select status,submitted_data,version from boards where id=$1",
      [board.id],
    )
  ).rows[0];
  assert.equal(persisted.status, "DRAFT");
  assert.equal(persisted.submitted_data, null);
  assert.equal(persisted.version, 0);
  const receipt = (
    await db.query<{ count: number }>("select count(*)::int as count from commands where project_id=$1 and key=$2", [project, commandKey])
  ).rows[0];
  assert.equal(receipt.count, 0);
  await db.close();
});

test("send_initial accepts complete customer intent", async () => {
  const db = await database();
  const owner = randomUUID();
  const project = randomUUID();
  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query("insert into projects(id,owner_id,phase) values($1,$2,'DIRECTION')", [project, owner]);
  const board = (
    await db.query<{ id: string }>(
      "insert into boards(project_id,kind,data) values($1,'initial',$2) returning id",
      [project, data({ id: "text", type: "text", text: "Use a quieter editorial direction" })],
    )
  ).rows[0];
  await db.query("select set_config('test.uid',$1,false)", [owner]);
  await db.query("select project_command($1,'send_initial',$2::jsonb,0,$3)", [project, JSON.stringify({ boardId: board.id }), randomUUID()]);
  const persisted = (
    await db.query<{ status: string; submitted_data: unknown; version: number }>("select status,submitted_data,version from boards where id=$1", [board.id])
  ).rows[0];
  assert.equal(persisted.status, "SUBMITTED");
  assert.notEqual(persisted.submitted_data, null);
  assert.equal(persisted.version, 1);
  await db.close();
});
