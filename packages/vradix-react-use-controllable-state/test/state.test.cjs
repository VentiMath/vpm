'use strict';
const {test}=require('node:test'),{execFileSync}=require('node:child_process'),path=require('node:path');
for(const variant of ['vpm','upstream'])for(const version of ['19.1','19.2'])test(`${variant} / React ${version}`,()=>{
 execFileSync(process.execPath,[path.resolve(__dirname,'../../../scripts/radix-state-conformance/run.cjs'),variant,version],{stdio:'pipe',timeout:30000});
});
