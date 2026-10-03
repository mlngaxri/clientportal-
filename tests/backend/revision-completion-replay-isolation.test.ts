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

test("completion replay cannot roll back a newer submitted revision", async () => {
  const db = await database();
  const owner = randomUUID();
  const project = randomUUID();
  const completeKey = randomUUID();

  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query(
    "insert into projects(id,owner_id,phase,revision_limit,revision_used) values($1,$2,'REVIEW',3,0)",
    [project, owner],
  );
  const firstBoard = (
    await db.query<{ id: string }>(
      "insert into boards(project_id,kind,data) values($1,'revision',$2) returning id",
      [project, JSON.stringify({ objects: [{ id: "first", type: "text", text: "First revision" }] })],
    )
  ).rows[0];

  await db.query("select set_config('test.uid',$1,false)", [owner]);
  await db.query("select project_command($1,'submit_revision',$2::jsonb,0,$3)", [
    project,
    JSON.stringify({ boardId: firstBoard.id }),
    randomUUID(),
  ]);
  await db.query("select set_config('test.role','operator',false)");
  await db.query("select project_command($1,'start_revision',$2::jsonb,1,$3)", [
    project,
    JSON.stringify({ boardId: firstBoard.id }),
    randomUUID(),
  ]);
  const completed = await db.query<{ result: unknown }>(
    "select project_command($1,'complete_revision',$2::jsonb,2,$3) as result",
    [project, JSON.stringify({ boardId: firstBoard.id }), completeKey],
  );

  const nextBoard = (
    await db.query<{ id: string }>(
      "select id from boards where project_id=$1 and kind='revision' and status='DRAFT'",
      [project],
    )
  ).rows[0];
  const newerData = { objects: [{ id: "next", type: "text", text: "Keep the newer customer direction" }] };

  await db.query("select set_config('test.role','',false)");
  await db.query("select project_command($1,'save_board',$2::jsonb,0,$3)", [
    project,
    JSON.stringify({ boardId: nextBoard.id, data: newerData }),
    randomUUID(),
  ]);
  await db.query("select project_command($1,'submit_revision',$2::jsonb,1,$3)", [
    project,
    JSON.stringify({ boardId: nextBoard.id }),
    randomUUID(),
  ]);

  await db.query("select set_config('test.role','operator',false)");
  const replay = await db.query<{ result: unknown }>(
    "select project_command($1,'complete_revision',$2::jsonb,2,$3) as result",
    [project, JSON.stringify({ boardId: firstBoard.id }), completeKey],
  );
  assert.deepEqual(replay.rows[0].result, completed.rows[0].result);

  const persisted = (
    await db.query<{
      data: unknown;
      submitted_data: unknown;
      status: string;
      version: number;
      revision_used: number;
      completion_receipts: number;
      drafts: number;
    }>(
      `select b.data,b.submitted_data,b.status,b.version,p.revision_used,
        (select count(*)::int from commands c where c.project_id=$1 and c.key=$3) as completion_receipts,
        (select count(*)::int from boards d where d.project_id=$1 and d.kind='revision' and d.status='DRAFT') as drafts
       from boards b join projects p on p.id=b.project_id where b.id=$2`,
      [project, nextBoard.id, completeKey],
    )
  ).rows[0];

  assert.deepEqual(persisted.data, newerData);
  assert.deepEqual(persisted.submitted_data, newerData);
  assert.equal(persisted.status, "SUBMITTED");
  assert.equal(persisted.version, 2);
  assert.equal(persisted.revision_used, 2);
  assert.equal(persisted.completion_receipts, 1);
  assert.equal(persisted.drafts, 0);

  await db.close();
});
