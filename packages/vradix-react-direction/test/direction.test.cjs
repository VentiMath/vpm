'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
for(const variant of ['upstream','vpm'])for(const environment of ['client','server'])test(variant+' '+environment+' direction contract and caller',()=>{
 const child=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/radix-context-conformance/direction.cjs'),variant,environment],{encoding:'utf8',timeout:30000});assert.equal(child.status,0,child.stdout+child.stderr);
});
test('pinned original direction sources retain their recorded hashes',()=>{
 const provenance=require('../PROVENANCE.json'),root=path.resolve(__dirname,'../../../scripts/radix-context-conformance/node_modules/@radix-ui/react-direction');for(const [name,hash] of Object.entries(provenance.sourceSHA256))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex'),hash);
});
