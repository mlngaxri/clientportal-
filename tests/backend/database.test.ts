import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('app_metadata',jsonb_build_object('role',current_setting('test.role',true)))$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`,
);
for (const migration of (await readdir("supabase/migrations")).filter(name => name.endsWith(".sql")).sort()) {
  await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
}
const owner = randomUUID(),
  other = randomUUID(),
  pid = randomUUID();
await db.query("insert into auth.users(id) values($1),($2)", [owner, other]);
await db.query("insert into projects(id,owner_id) values($1,$2)", [pid, owner]);
await db.query("select set_config('test.uid',$1,false)", [owner]);
async function p() {
  return (await db.query<any>("select * from projects where id=$1", [pid]))
    .rows[0];
}
async function b(kind = "initial", status?: string) {
  return (
    await db.query<any>(
      "select * from boards where project_id=$1 and kind=$2 " +
        (status ? "and status=$3" : "") +
        " order by created_at desc limit 1",
      status ? [pid, kind, status] : [pid, kind],
    )
  ).rows[0];
}
async function cmd(
  action: string,
  payload: any = {},
  expected?: number,
  key = randomUUID(),
) {
  const v = expected ?? (await p()).version;
  return (
    await db.query<any>("select project_command($1,$2,$3,$4,$5) as result", [
      pid,
      action,
      JSON.stringify(payload),
      v,
      key,
    ])
  ).rows[0].result;
}
let checks = 0;
function ok(value: unknown) {
  assert.ok(value);
  checks++;
}
await cmd("save_business", {
  name: "Mori House",
  brief: { description: "Dinner" },
  objects: [{ id: "intro", type: "text", text: "Dinner" }],
});
ok((await p()).phase === "AWAITING_INITIAL_PAYMENT");
const intent1=(await db.query<any>('select reserve_checkout($1,$2) as r',[pid,'initial'])).rows[0].r;
const intent2=(await db.query<any>('select reserve_checkout($1,$2) as r',[pid,'initial'])).rows[0].r;
ok(intent1.key===intent2.key);
await assert.rejects(()=>db.query('select reserve_checkout($1,$2)',[pid,'final']),/unavailable/);checks++;
await assert.rejects(() => cmd("begin_build"));
checks++;
await db.query("select bind_checkout($1, $2, $3, $4)", [pid, "initial", intent1.key, "cs_1"]);
await db.query("select record_payment($1,$2,$3,$4,$5,$6)", [
  "evt_1",
  "cs_1",
  pid,
  "initial",
  20000,
  "aud",
]);
ok((await p()).phase === "DIRECTION");
let initial = await b();
await assert.rejects(()=>cmd('save_board',{boardId:initial.id,data:{objects:[{id:'x',type:'link',url:'javascript:alert(1)',text:'unsafe'}]}},initial.version),/HTTP/);checks++;
await cmd(
  "save_board",
  {
    boardId: initial.id,
    data: { objects: [{ id: "a", type: "text", text: "Original" }] },
  },
  initial.version,
);
await assert.rejects(
  () =>
    cmd(
      "save_board",
      { boardId: initial.id, data: { objects: [] } },
      initial.version,
    ),
  /conflict/,
);
checks++;
initial = await b();
await cmd("send_initial", { boardId: initial.id }, initial.version);
ok((await p()).revision_used === 0);
await db.query("select set_config('test.role','operator',false)");
await cmd("begin_build");
initial = await b();
ok(initial.locked_at);
await assert.rejects(
  () =>
    cmd(
      "save_board",
      { boardId: initial.id, data: { objects: [] } },
      initial.version,
    ),
  /locked/,
);
checks++;
await cmd("deliver", { url: "https://example.com" });
let revision = await b("revision", "DRAFT");
await cmd(
  "save_board",
  {
    boardId: revision.id,
    data: { objects: [{ id: "r", type: "text", text: "Change heading" }] },
  },
  revision.version,
);
ok((await p()).revision_used === 0);
revision = await b("revision", "DRAFT");
const key = randomUUID();
await cmd("submit_revision", { boardId: revision.id }, revision.version, key);
await cmd("submit_revision", { boardId: revision.id }, revision.version, key);
ok((await p()).revision_used === 1);
revision = await b("revision", "SUBMITTED");
await cmd("withdraw_revision", { boardId: revision.id }, revision.version);
ok((await p()).revision_used === 0);
revision = await b("revision", "DRAFT");
await cmd("submit_revision", { boardId: revision.id }, revision.version);
revision = await b("revision", "SUBMITTED");
await cmd("start_revision", { boardId: revision.id }, revision.version);
revision = await b("revision", "IN_PROGRESS");
await assert.rejects(() =>
  cmd("withdraw_revision", { boardId: revision.id }, revision.version),
);
checks++;
ok((await b("revision", "DRAFT")).status === "DRAFT");
await cmd("complete_revision", { boardId: revision.id }, revision.version);
await cmd("approve");
ok((await p()).phase === "APPROVED_AWAITING_FINAL_PAYMENT");
await assert.rejects(() => cmd("launch"));
checks++;
await assert.rejects(() =>
  db.query("select record_payment($1,$2,$3,$4,$5,$6)", [
    "evt_bad",
    "cs_bad",
    pid,
    "final",
    1,
    "aud",
  ]),
);
checks++;
const finalIntent=(await db.query<any>("select reserve_checkout($1,$2) as r",[pid,"final"])).rows[0].r;
await db.query("select bind_checkout($1,$2,$3,$4)",[pid,"final",finalIntent.key,"cs_2"]);
await db.query("select record_payment($1,$2,$3,$4,$5,$6)", [
  "evt_2",
  "cs_2",
  pid,
  "final",
  130000,
  "aud",
]);
await db.query("select record_payment($1,$2,$3,$4,$5,$6)", [
  "evt_2",
  "cs_2",
  pid,
  "final",
  130000,
  "aud",
]);
ok((await p()).phase === "LAUNCH");
await assert.rejects(() => cmd("launch"), /verified|Launch checks/);
checks++;
await db.query("select set_config('test.role','',false)");
await db.query("select set_config('test.uid',$1,false)", [other]);
await assert.rejects(
  () => cmd("save_launch", { data: { domain: "stolen.example" } }),
  /access denied/,
);
checks++;
await db.exec("set role authenticated");
const leaked = await db.query("select * from projects");
ok(leaked.rows.length === 0);
await assert.rejects(
  () => db.query("update projects set pro=true where id=$1", [pid]),
  /permission denied/,
);
checks++;
await db.exec("reset role");
await db.query("select set_config('test.uid',$1,false)", [owner]);
await db.exec("set role authenticated");
ok((await db.query("select * from projects")).rows.length === 1);
await assert.rejects(
  () => db.query("insert into projects(owner_id,pro) values($1,true)", [owner]),
  /permission denied/,
);
checks++;
await db.exec("reset role");
console.log(
  `${checks} database assertions passed: lifecycle, stale saves, immutable briefs, revision replay/withdrawal/locks, payment gates, RLS and privilege escalation.`,
);
await db.close();
