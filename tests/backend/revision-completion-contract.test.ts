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

test("revision completion replay cannot duplicate or strand the next draft", async () => {
  const db = await database();
  const owner = randomUUID();
  const project = randomUUID();
  const submitKey = randomUUID();
  const startKey = randomUUID();
  const completeKey = randomUUID();
  const staleCompleteKey = randomUUID();

  await db.query("insert into auth.users(id) values($1)", [owner]);
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
  const first = await db.query<{ result: unknown }>(
    "select project_command($1,'complete_revision',$2::jsonb,2,$3) as result",
    [project, JSON.stringify({ boardId: board.id }), completeKey],
  );
  const replay = await db.query<{ result: unknown }>(
    "select project_command($1,'complete_revision',$2::jsonb,2,$3) as result",
    [project, JSON.stringify({ boardId: board.id }), completeKey],
  );
  assert.deepEqual(replay.rows[0].result, first.rows[0].result);

  await assert.rejects(
    () =>
      db.query(
        "select project_command($1,'complete_revision',$2::jsonb,3,$3)",
        [project, JSON.stringify({ boardId: board.id }), staleCompleteKey],
      ),
    /Invalid revision completion/,
  );

  const persisted = (
    await db.query<{
      phase: string;
      revision_used: number;
      status: string;
      version: number;
      drafts: number;
    }>(
      `select p.phase,p.revision_used,b.status,b.version,
        (select count(*)::int from boards d where d.project_id=p.id and d.kind='revision' and d.status='DRAFT') as drafts
       from projects p join boards b on b.project_id=p.id where p.id=$1 and b.id=$2`,
      [project, board.id],
    )
  ).rows[0];
  assert.equal(persisted.phase, "REVIEW");
  assert.equal(persisted.revision_used, 1);
  assert.equal(persisted.status, "DONE");
  assert.equal(persisted.version, 3);
  assert.equal(persisted.drafts, 1);

  const commands = (
    await db.query<{ completed: number; stale: number }>(
      `select
        count(*) filter (where key=$2)::int as completed,
        count(*) filter (where key=$3)::int as stale
       from commands where project_id=$1`,
      [project, completeKey, staleCompleteKey],
    )
  ).rows[0];
  assert.equal(commands.completed, 1);
  assert.equal(commands.stale, 0);

  await db.close();
});

test("stale owner writes cannot overwrite or submit a newer next draft after revision completion", async () => {
  const db = await database();
  const owner = randomUUID();
  const project = randomUUID();
  const staleSaveKey = randomUUID();
  const staleSubmitKey = randomUUID();
  const firstSaveKey = randomUUID();
  const submitKey = randomUUID();
  const original = { objects: [] };
  const firstReplacement = { objects: [{ id: "text", type: "text", text: "Fresh follow-up direction" }] };
  const staleReplacement = { objects: [{ id: "text", type: "text", text: "Stale follow-up direction" }] };
  const finalReplacement = { objects: [{ id: "text", type: "text", text: "Latest follow-up direction" }] };

  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query(
    "insert into projects(id,owner_id,phase,revision_limit,revision_used) values($1,$2,'REVIEW',3,0)",
    [project, owner],
  );
  const completedBoard = (
    await db.query<{ id: string }>(
      "insert into boards(project_id,kind,data) values($1,'revision',$2) returning id",
      [project, JSON.stringify({ objects: [{ id: "text", type: "text", text: "First revision" }] })],
    )
  ).rows[0];

  await db.query("select set_config('test.uid',$1,false)", [owner]);
  await db.query("select project_command($1,'submit_revision',$2::jsonb,0,$3)", [project, JSON.stringify({ boardId: completedBoard.id }), randomUUID()]);
  await db.query("select set_config('test.role','operator',false)");
  await db.query("select project_command($1,'start_revision',$2::jsonb,1,$3)", [project, JSON.stringify({ boardId: completedBoard.id }), randomUUID()]);
  await db.query("select project_command($1,'complete_revision',$2::jsonb,2,$3)", [project, JSON.stringify({ boardId: completedBoard.id }), randomUUID()]);

  const nextDraft = (
    await db.query<{ id: string; data: unknown; version: number }>(
      "select id,data,version from boards where project_id=$1 and kind='revision' and status='DRAFT'",
      [project],
    )
  ).rows[0];
  assert.deepEqual(nextDraft.data, original);
  assert.equal(nextDraft.version, 0);

  await db.query("select set_config('test.role','',false)");
  await db.query(
    "select project_command($1,'save_board',$2::jsonb,0,$3)",
    [project, JSON.stringify({ boardId: nextDraft.id, data: firstReplacement }), firstSaveKey],
  );

  await assert.rejects(
    () => db.query("select project_command($1,'save_board',$2::jsonb,0,$3)", [project, JSON.stringify({ boardId: nextDraft.id, data: staleReplacement }), staleSaveKey]),
    /conflict/i,
  );
  await assert.rejects(
    () => db.query("select project_command($1,'submit_revision',$2::jsonb,0,$3)", [project, JSON.stringify({ boardId: nextDraft.id }), staleSubmitKey]),
    /conflict/i,
  );

  const afterStaleWrites = (
    await db.query<{ data: unknown; version: number; revision_used: number; first_receipts: number; stale_save_receipts: number; stale_submit_receipts: number }>(
      `select b.data,b.version,p.revision_used,
        (select count(*)::int from commands c where c.project_id=$1 and c.key=$3) as first_receipts,
        (select count(*)::int from commands c where c.project_id=$1 and c.key=$4) as stale_save_receipts,
        (select count(*)::int from commands c where c.project_id=$1 and c.key=$5) as stale_submit_receipts
       from boards b join projects p on p.id=b.project_id where b.id=$2`,
      [project, nextDraft.id, firstSaveKey, staleSaveKey, staleSubmitKey],
    )
  ).rows[0];
  assert.deepEqual(afterStaleWrites.data, firstReplacement);
  assert.equal(afterStaleWrites.version, 1);
  assert.equal(afterStaleWrites.revision_used, 1);
  assert.equal(afterStaleWrites.first_receipts, 1);
  assert.equal(afterStaleWrites.stale_save_receipts, 0);
  assert.equal(afterStaleWrites.stale_submit_receipts, 0);

  await db.query("select project_command($1,'save_board',$2::jsonb,1,$3)", [project, JSON.stringify({ boardId: nextDraft.id, data: finalReplacement }), randomUUID()]);
  await db.query("select project_command($1,'submit_revision',$2::jsonb,2,$3)", [project, JSON.stringify({ boardId: nextDraft.id }), submitKey]);
  const submitted = (
    await db.query<{ data: unknown; submitted_data: unknown; version: number; status: string; revision_used: number; submit_receipts: number }>(
      `select b.data,b.submitted_data,b.version,b.status,p.revision_used,
        (select count(*)::int from commands c where c.project_id=$1 and c.key=$3) as submit_receipts
       from boards b join projects p on p.id=b.project_id where b.id=$2`,
      [project, nextDraft.id, submitKey],
    )
  ).rows[0];
  assert.deepEqual(submitted.data, finalReplacement);
  assert.deepEqual(submitted.submitted_data, finalReplacement);
  assert.equal(submitted.version, 3);
  assert.equal(submitted.status, "SUBMITTED");
  assert.equal(submitted.revision_used, 2);
  assert.equal(submitted.submit_receipts, 1);

  await db.close();
});
