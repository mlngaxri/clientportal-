import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
test('portal interface copy contains no em dashes',async()=>{for(const file of await readdir('public'))if(/\.(html|js|css)$/.test(file)){const text=await readFile(`public/${file}`,'utf8');assert.ok(!/[\u2014]|&mdash;|&#(?:8212|x2014);|\\u2014/i.test(text),file);}});
