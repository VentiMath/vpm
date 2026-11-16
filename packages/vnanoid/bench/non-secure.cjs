'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
// Pin history instead of committing another copy of a former implementation.
const revision='a8e36cfb7987666632aa51fe07e0a5780027d916';
function previous(){
 const source=execFileSync('git',['show',revision+':packages/vnanoid/non-secure.cjs'],{cwd:root,encoding:'utf8'});
 assert.equal(createHash('sha256').update(source).digest('hex'),'2d34a0c7dc484578cbd71df6615798ffe0b71aab9a30130610709c9c8ed10af0');
 const filename=path.join(root,'previous-non-secure.cjs'),m=new Module(filename,module);m.filename=filename;m.paths=module.paths;
 m._compile(source,filename);return m.exports;
}
const cases=[6,21].map(size=>({name:'Previous VPM non-secure '+size,make(file){const api=file===root?require('../non-secure.cjs'):previous();return()=>api.nanoid(size)},validate(id){assert.equal(id.length,size);assert.match(id,/^[A-Za-z0-9_-]+$/)}}));
require('../../../scripts/bench-process.cjs').run({root,upstream:'previous',vpm:root,cases,files:['engine.cjs','non-secure.cjs','package.json','PROVENANCE.json','bench/non-secure.cjs']}).catch(e=>{console.error(e);process.exitCode=1});
