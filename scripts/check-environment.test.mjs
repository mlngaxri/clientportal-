import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectEnvironment} from './check-environment.mjs';
test('staging rejects missing secrets without printing values',()=>{const r=inspectEnvironment({APP_ENV:'staging',STRIPE_SECRET_KEY:'sk_live_DO_NOT_ECHO'});assert.equal(r.configurationReady,false);assert.ok(r.failures.some(s=>s.includes('test-mode')));assert.ok(!JSON.stringify(r).includes('DO_NOT_ECHO'));});
test('staging rejects shared production database',()=>{const r=inspectEnvironment({APP_ENV:'staging',SUPABASE_PROJECT_REF:'shared',PRODUCTION_SUPABASE_PROJECT_REF:'shared'});assert.ok(r.failures.some(s=>s.includes('must be separate')));});
test('development checks existing minimal provider configuration',()=>{const r=inspectEnvironment({APP_ENV:'development',APP_URL:'http://localhost:3000',NEXT_PUBLIC_SUPABASE_URL:'https://stage.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test-public-value',SUPABASE_SERVICE_ROLE_KEY:'test-server-value'});assert.equal(r.configurationReady,true);});
