import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { sessionCookieOptions, sessionExpired } from "../../lib/auth-session";
import { verifySaveReceipt } from "../../lib/save-integrity";
import type { Board } from "../../lib/model";

test("session expiry is absolute and unchecked sessions have no persistent cookie", () => {
  assert.equal(sessionExpired(String(Date.now()-1)), true);
  assert.equal(sessionExpired("invalid"), true);
  assert.equal(sessionExpired(String(Date.now()+10000)), false);
  assert.equal("maxAge" in sessionCookieOptions(false), false);
  assert.ok(sessionCookieOptions(true).maxAge! > 0);
});
test("Saved requires exact acknowledged board identity, version and semantic content", () => {
  const data = { objects: [], name: "One" };
  const board = { id: "b", project_id: "p", version: 3, data: { name: "One", objects: [] } } as unknown as Board;
  assert.equal(verifySaveReceipt(board, "p", "b", 2, data), board);
  for (const receipt of [undefined, {...board, version: 2}, {...board, id: "other"}, {...board, data: {objects: []}}]) assert.throws(() => verifySaveReceipt(receipt, "p", "b", 2, data));
});
test("SQL save validation, replay binding and atomic onboarding", async () => {
 const db = new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;grant usage on schema auth to authenticated;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);`);
 await db.exec(await readFile("supabase/migrations/001_fourthform.sql", "utf8"));
 await db.exec(await readFile("supabase/migrations/002_auth_save_integrity.sql", "utf8"));
 const owner=randomUUID(), other=randomUUID();
 await db.query("insert into auth.users(id) values($1),($2)",[owner,other]);
 await db.query("select set_config('test.uid',$1,false)",[owner]);
 const ensure=async()=> (await db.query<any>("select ensure_onboarding_project() as p")).rows[0].p;
 const p=await ensure(); assert.equal((await ensure()).id,p.id);
 const command=async(action:string,payload:unknown,version=0,key=randomUUID()) => (await db.query<any>("select project_command($1,$2,$3,$4,$5) as r",[p.id,action,JSON.stringify(payload),version,key])).rows[0].r;
 const key=randomUUID(), payload={name:"Mori",brief:{},objects:[]};
 const saved=await command("save_business",payload,0,key);
 assert.deepEqual(await command("save_business",payload,0,key),saved);
 await assert.rejects(()=>command("save_business",{...payload,name:"changed"},0,key),/different request/);
 await assert.rejects(()=>command("save_business",payload,1,key),/different request/);
 assert.equal((await ensure()).id,p.id);
 await assert.rejects(()=>command("save_business",{name:null,brief:{},objects:[]},1),/Invalid business/);
 await db.query("update projects set phase='DIRECTION' where id=$1",[p.id]);
 const board=(await db.query<any>("select * from boards where project_id=$1",[p.id])).rows[0];
 await assert.rejects(()=>command("save_board",{boardId:board.id,data:{}},board.version),/Invalid Direction/);
 await assert.rejects(()=>command("save_board",{boardId:board.id,data:{objects:[{id:"x",type:"file",assetId:null,url:null}]}},board.version),/Invalid project asset/);
 await assert.rejects(()=>command("save_board",{boardId:board.id,data:{objects:[{id:"x",type:"text"},{id:"x",type:"text"}]}},board.version),/unique/);
 await db.query("select set_config('test.uid',$1,false)",[other]);
 await assert.rejects(()=>command("save_business",payload,0,key),/access denied/);
 await db.exec("set role authenticated");
 await assert.rejects(()=>db.query("select project_command_internal($1,$2,$3,$4,$5)",[p.id,"save_business",JSON.stringify(payload),0,key]),/permission denied/);
 } finally { await db.close(); }
});
