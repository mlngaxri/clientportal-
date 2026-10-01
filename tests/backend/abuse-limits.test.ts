import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { limitBucket, requestSubject } from '../../lib/security/limits';
test('rate-limit identity is opaque and spoofed forwarding is ignored off Vercel', () => {
 assert.equal(requestSubject(new Request('https://app.test', {headers: {'x-forwarded-for':'attacker'}}),false),'deployment');
 assert.equal(requestSubject(new Request('https://app.test', {headers: {'x-forwarded-for':'192.0.2.1, proxy'}}),true),'192.0.2.1');
 const bucket=limitBucket('upload','private-user','secret');
 assert.ok(!bucket.includes('private-user')); assert.notEqual(bucket,limitBucket('upload','private-user','other'));
});
test('distributed limiter enforces capacity, expiry, validation and backend-only grants', async () => {
 const db=new PGlite();
 try {
 await db.exec('create role anon; create role authenticated; create role service_role;');
 await db.exec(await readFile('supabase/migrations/005_abuse_limits.sql','utf8'));
 const hit=async()=> (await db.query<any>("select consume_request_limit('bucket',2,60) as r")).rows[0].r;
 assert.equal((await hit()).allowed,true);assert.equal((await hit()).allowed,true);assert.equal((await hit()).allowed,false);
 await db.exec("update request_limits set resets_at=now()-interval '1 second'");assert.equal((await hit()).allowed,true);
 await assert.rejects(()=>db.query("select consume_request_limit('x',0,60)"),/Invalid/);
 await db.exec('set role authenticated');
 await assert.rejects(()=>hit(),/permission denied/);
 await assert.rejects(()=>db.query('select * from request_limits'),/permission denied/);
 } finally {await db.close()}
});
