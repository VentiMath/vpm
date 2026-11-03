'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
for(const file of ['app-check','update-schema','user-listing'])test(file+' application completion controls',()=>{const r=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/firebase-admin-conformance/'+file+'.cjs')],{encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stdout+r.stderr);});
