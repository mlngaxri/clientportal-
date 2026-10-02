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

test("operators cannot submit or withdraw customer revisions", async () => {
  const db = await database();
  const owner = randomUUID();
  const operator = randomUUID();
  const project = randomUUID();

  await db.query("insert into auth.users(id) values($1),($2)", [owner, operator]);
  await db.query(
    "insert into projects(id,owner_id,phase,revision_limit,revision_used) values($1,$2,'REVIEW',3,0)",
    [project, owner],
  );
  const board = (
    await db.query<{ id: string }>(
      "insert into boards(project_id,kind,data) values($1,'revision',$2) returning id",
      [project, JSON.stringify({ objects: [{ id: "text", type: "text", text: "Change the heading" }] })],
    )
  ).rows[0];

  await db.query("select set_config('test.uid',$1,false)", [operator]);
  await db.query("select set_config('test.role','operator',false)");
  await assert.rejects(
    () => db.query("select project_command($1,'submit_revision',$2::jsonb,0,$3)", [project, JSON.stringify({ boardId: board.id }), randomUUID()]),
    /Only the project owner can manage revision submissions/,
  );

  await db.query("select set_config('test.uid',$1,false)", [owner]);
  await db.query("select set_config('test.role','',false)");
  await db.query("select project_command($1,'submit_revision',$2::jsonb,0,$3)", [project, JSON.stringify({ boardId: board.id }), randomUUID()]);

  await db.query("select set_config('test.uid',$1,false)", [operator]);
  await db.query("select set_config('test.role','operator',false)");
  await assert.rejects(
    () => db.query("select project_command($1,'withdraw_revision',$2::jsonb,1,$3)", [project, JSON.stringify({ boardId: board.id }), randomUUID()]),
    /Only the project owner can manage revision submissions/,
  );

  const persisted = (
    await db.query<{ status: string; revision_used: number; commands: number }>(
      `select b.status,p.revision_used,(select count(*)::int from commands c where c.project_id=p.id) as commands
       from projects p join boards b on b.project_id=p.id where p.id=$1 and b.id=$2`,
      [project, board.id],
    )
  ).rows[0];
  assert.equal(persisted.status, "SUBMITTED");
  assert.equal(persisted.revision_used, 1);
  assert.equal(persisted.commands, 1);

  await db.close();
});
