import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

test("losing Pro entitlement preserves the pinned State release", async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`);
  for (const migration of ["001_fourthform.sql", "002_auth_save_integrity.sql", "011_states_contract.sql", "014_state_publication.sql"]) {
    await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
  }

  const owner = randomUUID();
  const project = randomUUID();
  const board = randomUUID();
  const key = randomUUID();
  const states = [{
    id: "dinner",
    title: "Dinner",
    enabled: true,
    timezone: "Australia/Brisbane",
    days: [5],
    start: "17:00",
    end: "23:00",
    priority: 10,
    overrides: { heading: "Dinner tonight" },
  }];

  await db.query("insert into auth.users(id) values($1)", [owner]);
  await db.query("insert into projects(id,owner_id,phase,pro) values($1,$2,'LIVE',true)", [project, owner]);
  await db.query("insert into boards(id,project_id,kind,data,version) values($1,$2,'states',$3::jsonb,0)", [board, project, JSON.stringify({ states })]);
  await db.query("select set_config('test.uid',$1,false)", [owner]);

  await db.query("select activate_state_schedules($1,$2,0,$3)", [project, board, key]);
  const activated = (await db.query<any>("select states,board_version from state_releases where project_id=$1", [project])).rows[0];
  assert.deepEqual(activated.states, states);
  assert.equal(activated.board_version, 0);

  await db.query("update projects set pro=false where id=$1", [project]);
  const preserved = (await db.query<any>("select states,board_version from state_releases where project_id=$1", [project])).rows[0];
  assert.deepEqual(preserved, activated, "entitlement loss must disable evaluation without deleting or rewriting the release snapshot");

  await assert.rejects(
    () => db.query("select activate_state_schedules($1,$2,0,$3)", [project, board, randomUUID()]),
    /Pro is required to activate States on a live website/,
  );
  assert.equal((await db.query<any>("select count(*)::int n from state_releases where project_id=$1", [project])).rows[0].n, 1);

  await db.close();
});
