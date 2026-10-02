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

const data = (object: Record<string, unknown>) =>
  JSON.stringify({ objects: [object] });

test("persisted revision submissions reject semantically empty Directions", async () => {
  const db = await database();
  const owner = randomUUID();
  const project = randomUUID();
  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query("insert into projects(id,owner_id) values($1,$2)", [project, owner]);
  const board = (
    await db.query<{ id: string }>(
      "insert into boards(project_id,kind,data) values($1,'revision',$2) returning id",
      [project, data({ id: "empty", type: "text", text: "   ", target: { page: "/" } })],
    )
  ).rows[0];

  await assert.rejects(
    () =>
      db.query(
        "update boards set status='SUBMITTED', submitted_data=data where id=$1",
        [board.id],
      ),
    /revision_submission_requires_complete_directions/,
  );
  const persisted = (
    await db.query<{ status: string }>("select status from boards where id=$1", [board.id])
  ).rows[0];
  assert.equal(persisted.status, "DRAFT");
  await db.close();
});

test("project_command rejects an incomplete revision without consuming entitlement", async () => {
  const db = await database();
  const owner = randomUUID();
  const project = randomUUID();
  const commandKey = randomUUID();
  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query(
    "insert into projects(id,owner_id,phase,revision_limit,revision_used) values($1,$2,'REVIEW',3,1)",
    [project, owner],
  );
  const board = (
    await db.query<{ id: string }>(
      "insert into boards(project_id,kind,data) values($1,'revision',$2) returning id",
      [project, data({ id: "empty", type: "text", text: "   ", target: { page: "/" } })],
    )
  ).rows[0];
  await db.query("select set_config('test.uid',$1,false)", [owner]);

  await assert.rejects(
    () =>
      db.query(
        "select project_command($1,'submit_revision',$2::jsonb,0,$3)",
        [project, JSON.stringify({ boardId: board.id }), commandKey],
      ),
    /revision_submission_requires_complete_directions/,
  );

  const persisted = (
    await db.query<{ status: string; submitted_data: unknown; revision_used: number }>(
      "select b.status,b.submitted_data,p.revision_used from boards b join projects p on p.id=b.project_id where b.id=$1",
      [board.id],
    )
  ).rows[0];
  assert.equal(persisted.status, "DRAFT");
  assert.equal(persisted.submitted_data, null);
  assert.equal(persisted.revision_used, 1);
  const commands = (
    await db.query<{ count: number }>(
      "select count(*)::int as count from commands where project_id=$1 and key=$2",
      [project, commandKey],
    )
  ).rows[0];
  assert.equal(commands.count, 0);
  await db.close();
});

test("revision submit replay cannot double-consume and withdrawal refunds exactly once", async () => {
  const db = await database();
  const owner = randomUUID();
  const project = randomUUID();
  const submitKey = randomUUID();
  const withdrawKey = randomUUID();
  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query(
    "insert into projects(id,owner_id,phase,revision_limit,revision_used) values($1,$2,'REVIEW',3,1)",
    [project, owner],
  );
  const board = (
    await db.query<{ id: string }>(
      "insert into boards(project_id,kind,data) values($1,'revision',$2) returning id",
      [project, data({ id: "text", type: "text", text: "Change the heading" })],
    )
  ).rows[0];
  await db.query("select set_config('test.uid',$1,false)", [owner]);

  const submit = await db.query<{ project_command: unknown }>(
    "select project_command($1,'submit_revision',$2::jsonb,0,$3)",
    [project, JSON.stringify({ boardId: board.id }), submitKey],
  );
  const replay = await db.query<{ project_command: unknown }>(
    "select project_command($1,'submit_revision',$2::jsonb,0,$3)",
    [project, JSON.stringify({ boardId: board.id }), submitKey],
  );
  assert.deepEqual(replay.rows[0].project_command, submit.rows[0].project_command);

  let persisted = (
    await db.query<{ status: string; revision_used: number; version: number }>(
      "select b.status,p.revision_used,b.version from boards b join projects p on p.id=b.project_id where b.id=$1",
      [board.id],
    )
  ).rows[0];
  assert.equal(persisted.status, "SUBMITTED");
  assert.equal(persisted.revision_used, 2);
  assert.equal(persisted.version, 1);

  await db.query(
    "select project_command($1,'withdraw_revision',$2::jsonb,$3,$4)",
    [project, JSON.stringify({ boardId: board.id }), persisted.version, withdrawKey],
  );
  persisted = (
    await db.query<{ status: string; revision_used: number; version: number }>(
      "select b.status,p.revision_used,b.version from boards b join projects p on p.id=b.project_id where b.id=$1",
      [board.id],
    )
  ).rows[0];
  assert.equal(persisted.status, "DRAFT");
  assert.equal(persisted.revision_used, 1);
  assert.equal(persisted.version, 2);

  await db.query(
    "select project_command($1,'withdraw_revision',$2::jsonb,$3,$4)",
    [project, JSON.stringify({ boardId: board.id }), 1, withdrawKey],
  );
  const afterReplay = (
    await db.query<{ status: string; revision_used: number; version: number }>(
      "select b.status,p.revision_used,b.version from boards b join projects p on p.id=b.project_id where b.id=$1",
      [board.id],
    )
  ).rows[0];
  assert.equal(afterReplay.status, "DRAFT");
  assert.equal(afterReplay.revision_used, 1);
  assert.equal(afterReplay.version, 2);
  await db.close();
});

test("persisted revision submissions accept each supported form of customer intent", async () => {
  const cases = [
    { id: "text", type: "text", text: "Change the heading" },
    { id: "asset", type: "image", text: "", assetId: randomUUID() },
    { id: "drawing", type: "drawing", text: "", strokes: [{ id: "s", points: [{ x: 1, y: 1 }] }] },
    { id: "link", type: "link", text: "", url: "https://example.com/reference" },
  ];
  for (const object of cases) {
    const db = await database();
    const owner = randomUUID();
    const project = randomUUID();
    await db.query("insert into auth.users(id) values($1)", [owner]);
    await db.query("insert into projects(id,owner_id) values($1,$2)", [project, owner]);
    const payload = data(object);
    const board = (
      await db.query<{ id: string }>(
        "insert into boards(project_id,kind,data) values($1,'revision',$2) returning id",
        [project, payload],
      )
    ).rows[0];
    await db.query(
      "update boards set status='SUBMITTED', submitted_data=data where id=$1",
      [board.id],
    );
    const persisted = (
      await db.query<{ status: string }>("select status from boards where id=$1", [board.id])
    ).rows[0];
    assert.equal(persisted.status, "SUBMITTED");
    await db.close();
  }
});
