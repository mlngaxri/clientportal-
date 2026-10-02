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

test("locked revision cannot be withdrawn or refund its allowance", async () => {
  const db = await database();
  const owner = randomUUID();
  const project = randomUUID();
  const submitKey = randomUUID();
  const startKey = randomUUID();
  const withdrawKey = randomUUID();

  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query(
    "insert into projects(id,owner_id,phase,revision_limit,revision_used) values($1,$2,'REVIEW',3,1)",
    [project, owner],
  );
  const board = (
    await db.query<{ id: string }>(
      "insert into boards(project_id,kind,data) values($1,'revision',$2) returning id",
      [project, JSON.stringify({ objects: [{ id: "text", type: "text", text: "Change the heading" }] })],
    )
  ).rows[0];

  await db.query("select set_config('test.uid',$1,false)", [owner]);
  await db.query(
    "select project_command($1,'submit_revision',$2::jsonb,0,$3)",
    [project, JSON.stringify({ boardId: board.id }), submitKey],
  );

  await db.query("select set_config('test.role','operator',false)");
  await db.query(
    "select project_command($1,'start_revision',$2::jsonb,1,$3)",
    [project, JSON.stringify({ boardId: board.id }), startKey],
  );

  await db.query("select set_config('test.role','',false)");
  await assert.rejects(
    () =>
      db.query(
        "select project_command($1,'withdraw_revision',$2::jsonb,2,$3)",
        [project, JSON.stringify({ boardId: board.id }), withdrawKey],
      ),
    /Work has begun\. This Revision cannot be withdrawn/,
  );

  const persisted = (
    await db.query<{
      status: string;
      locked_at: string | null;
      revision_used: number;
      version: number;
    }>(
      "select b.status,b.locked_at,p.revision_used,b.version from boards b join projects p on p.id=b.project_id where b.id=$1",
      [board.id],
    )
  ).rows[0];
  assert.equal(persisted.status, "IN_PROGRESS");
  assert.notEqual(persisted.locked_at, null);
  assert.equal(persisted.revision_used, 2);
  assert.equal(persisted.version, 2);

  const commands = (
    await db.query<{ count: number }>(
      "select count(*)::int as count from commands where project_id=$1 and key=$2",
      [project, withdrawKey],
    )
  ).rows[0];
  assert.equal(commands.count, 0);

  await db.close();
});
