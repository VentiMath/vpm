'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
for(const variant of ['upstream','legacy','vpm'])test(variant+' context contracts and unchanged callers',()=>{const run=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/radix-context-conformance/run.cjs'),variant],{encoding:'utf8',timeout:30000});assert.equal(run.status,0,run.stdout+run.stderr)});

test('pinned current contract source matches provenance',()=>{const fs=require('node:fs'),{createHash}=require('node:crypto'),p=require('../PROVENANCE.json');const root=path.resolve(__dirname,'../../../scripts/radix-context-conformance/node_modules/@radix-ui/react-context');assert.equal(require(path.join(root,'package.json')).version,p.upstream.version);for(const [file,hash]of Object.entries(p.sourceSHA256))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash);});
