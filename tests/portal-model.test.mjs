import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const context=vm.createContext({structuredClone});vm.runInContext(await readFile('public/portal-model.js','utf8'),context);const m=context.ffPortalModel;
const defaults={Home:{heading:'Home',cta:'Book',image:'home.webp'},Menu:{heading:'Menu',cta:'Explore',image:'menu.webp'}};
test('unsaved per-page edits and images stay separate from saved website content',()=>{const state={cmsPages:{},cmsDrafts:{}};m.stageCms(state,'Home',{heading:'Draft home',cta:'Book',image:'custom.webp'});assert.equal(m.cmsFields(state,'Menu',defaults).image,'menu.webp');assert.equal(state.cmsPages.Home,undefined);assert.equal(m.cmsFields(state,'Home',defaults).heading,'Draft home');});
test('failed saves restore the previous published page and retain its draft',()=>{const state={cmsPages:{Home:{heading:'Saved',cta:'Book'}},cmsDrafts:{}};const next={heading:'New',cta:'Reserve'};m.stageCms(state,'Home',next);const change=m.prepareCms(state,'Home',next);m.rollbackCms(state,change);assert.equal(state.cmsPages.Home.heading,'Saved');assert.equal(state.cmsDrafts.Home.heading,'New');});
test('blank headings and action labels cannot replace visible website content',()=>{assert.ok(m.validateCms({heading:' ',cta:'Book'}));assert.ok(m.validateCms({heading:'Hello',cta:' '}));assert.equal(m.validateCms({heading:'Hello',cta:'Book'}),null)});
test('overnight States remain valid while missing, malformed or equal times fail',()=>{const state={stateName:'Late service',stateDays:[5],stateStart:'22:00',stateEnd:'01:00'};assert.equal(m.validSchedule(state),true);for(const changes of [{stateEnd:''},{stateStart:'25:00'},{stateEnd:'01:60'},{stateDays:[]},{stateDays:[8]},{stateEnd:'22:00'}])assert.equal(m.validSchedule({...state,...changes}),false);});
test('every period’s source and page breakdown adds up to its visible total',()=>{for(const total of [642,2481,7423,1612,6204,18648]){const counts=m.distribute(total,[1126,682,421,252]);assert.equal(counts.reduce((a,b)=>a+b,0),total);assert.ok(counts.every(v=>Number.isInteger(v)&&v>=0));}});

test('older text-only CMS records inherit the correct page image',()=>{const state={cmsPages:{Menu:{heading:'Saved menu',cta:'Explore'}},cmsDrafts:{Home:{heading:'Draft home',cta:'Book',image:'custom.webp'}}};assert.equal(m.cmsFields(state,'Menu',defaults).image,'menu.webp');assert.equal(m.cmsFields(state,'Menu',defaults).heading,'Saved menu');assert.ok(m.validateCms({heading:null,cta:'Book'}));});
