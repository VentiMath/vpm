'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
for(const version of [10,11])test(`Google Auth ${version} metadata paths use VPM and native fetch`,()=>{
 // Separate processes prevent aliasing a caller already cached by another Bun test.
 const result=spawnSync(process.execPath,[path.join(__dirname,'fixtures/current-consumer.cjs'),String(version)],{encoding:'utf8',timeout:30000});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error||''));
});
