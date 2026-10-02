import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";

async function database() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('app_metadata',jsonb_build_object('role',current_setting('test.role',true)))$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`);
  for (const migration of (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort()) await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
  return db;
}

test("stale operator start cannot lock a withdrawn and resubmitted revision", async () => {
  const db = await database();
  const owner = randomUUID();
  const operator = randomUUID();
  const project = randomUUID();
  const staleStartKey = randomUUID();
  const original = { objects: [{ id: "text", type: "text", text: "Original revision" }] };
  const resubmitted = { objects: [{ id: "text", type: "text", text: "Resubmitted revision" }] };

  await db.query("insert into auth.users(id) values($1),($2)", [owner, operator]);
  await db.query("insert into projects(id,owner_id,phase,revision_limit,revision_used) values($1,$2,'REVIEW',3,0)", [project, owner]);
  const board = (await db.query<{ id: string }>("insert into boards(project_id,kind,data) values($1,'revision',$2) returning id", [project, JSON.stringify(original)])).rows[0];

  await db.query("select set_config('test.uid',$1,false)", [owner]);
  await db.query("select set_config('test.role','',false)");
  await db.query("select project_command($1,'submit_revision',$2::jsonb,0,$3)", [project, JSON.stringify({ boardId: board.id }), randomUUID()]);
  await db.query("select project_command($1,'withdraw_revision',$2::jsonb,1,$3)", [project, JSON.stringify({ boardId: board.id }), randomUUID()]);
  await db.query("select project_command($1,'save_board',$2::jsonb,2,$3)", [project, JSON.stringify({ boardId: board.id, data: resubmitted }), randomUUID()]);
  await db.query("select project_command($1,'submit_revision',$2::jsonb,3,$3)", [project, JSON.stringify({ boardId: board.id }), randomUUID()]);

  await db.query("select set_config('test.uid',$1,false)", [operator]);
  await db.query("select set_config('test.role','operator',false)");
  await assert.rejects(() => db.query("select project_command($1,'start_revision',$2::jsonb,1,$3)", [project, JSON.stringify({ boardId: board.id }), staleStartKey]), /conflict/i);

  const persisted = (await db.query<{ data: unknown; submitted_data: unknown; status: string; locked_at: string | null; version: number; phase: string; revision_used: number; stale_receipts: number }>(`select b.data,b.submitted_data,b.status,b.locked_at,b.version,p.phase,p.revision_used,(select count(*)::int from commands c where c.project_id=$1 and c.key=$3) as stale_receipts from boards b join projects p on p.id=b.project_id where b.id=$2`, [project, board.id, staleStartKey])).rows[0];
  assert.deepEqual(persisted.data, resubmitted);
  assert.deepEqual(persisted.submitted_data, resubmitted);
  assert.equal(persisted.status, "SUBMITTED");
  assert.equal(persisted.locked_at, null);
  assert.equal(persisted.version, 4);
  assert.equal(persisted.phase, "REVIEW");
  assert.equal(persisted.revision_used, 1);
  assert.equal(persisted.stale_receipts, 0);
  await db.close();
});
