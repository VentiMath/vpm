'use strict';
// Explicit local maintenance command. Supply an extracted, immutable baseline
// package. Tests consume this reference; they never regenerate it automatically.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{JSDOM}=require('jsdom');
const canonical=require('./canonical-dom.cjs'),baseline=path.resolve(process.argv[2]);
const manifest=JSON.parse(fs.readFileSync(process.argv[4])),packageRecord=manifest.packages.find(p=>p.name==='vlx');
assert.equal(manifest.tag,'vlx-0.1.0-r6');assert.equal(manifest.sourceCommit,'39fd96bdfaedcb134cb50437c853a6b910be3e65');
for(const [file,expected]of Object.entries(packageRecord.sourceFiles))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(baseline,file))).digest('hex'),expected,file+' must match immutable r6');
const api=require(baseline),dom=new JSDOM(),host=dom.window.document.createElement('div');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cases=[];
for(const [name,tex]of require('./output-cases.cjs'))for(const display of [false,true]){
 const result=api.renderMath(tex,{display}),hashes={};
 for(const field of ['svg','mathml','html']){host.innerHTML=result[field];hashes[field]=digest(canonical(host.firstElementChild));}
 cases.push({name,tex,display,width:result.width,height:result.height,baseline:result.baseline,...hashes});
}
fs.writeFileSync(process.argv[3],JSON.stringify({baseline:manifest.tag,sourceCommit:manifest.sourceCommit,baselineArchiveSHA256:packageRecord.sha256,cases},null,2)+'\n');
dom.window.close();
