'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
for(const variant of ['upstream','vpm'])for(const version of ['19.1','19.2'])for(const mode of ['client','server'])test([variant,version,mode,'ID contract and real callers'].join(' '),()=>{
 const child=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/radix-id-conformance/run.cjs'),variant,version,mode],{encoding:'utf8',timeout:30000});assert.equal(child.status,0,child.stdout+child.stderr);
});
test('pinned upstream sources retain recorded hashes',()=>{const root=path.resolve(__dirname,'../../../scripts/radix-id-conformance/node_modules/@radix-ui/react-id');for(const [file,hash] of Object.entries(require('../PROVENANCE.json').sourceSHA256))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash);});
