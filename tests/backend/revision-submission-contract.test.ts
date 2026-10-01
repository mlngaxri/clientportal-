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
