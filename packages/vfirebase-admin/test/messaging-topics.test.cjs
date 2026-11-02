'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('Messaging topic ownership, concurrency, identifiers and app lifetime',()=>{const run=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/firebase-admin-conformance/messaging-topics.cjs')],{encoding:'utf8',timeout:60000});assert.equal(run.status,0,run.stderr||run.stdout);});
