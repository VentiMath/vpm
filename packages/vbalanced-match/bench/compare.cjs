'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/balanced-match-conformance'),upstream=path.join(fixture,'node_modules/balanced-match');
const cases=[
 {name:'Short brace pair',make(file){const api=require(file),match=api.balanced||api;return()=>match('{','}','src/{api,ui}/index.ts');},validate:r=>assert.equal(r.body,'api,ui')},
 {name:'Deep unmatched prefix',make(file){const api=require(file),match=api.balanced||api,input='{'.repeat(128)+'body}';return()=>match('{','}',input);},validate:r=>assert.equal(r.body,'body')},
 {name:'Unchanged brace expansion caller',make(file){const c=require(path.join(fixture,'fixture.cjs'))(file);process.once('exit',c.close);return()=>c.expand('{src,functions}/{api,ui}/**/*.{ts,tsx}');},validate:r=>assert.equal(r.length,8)}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm:root,cases,files:['index.cjs','bench/compare.cjs','../../scripts/balanced-match-conformance/fixture.cjs','../../scripts/balanced-match-conformance/package-lock.json',path.relative(root,path.join(upstream,'dist/commonjs/index.js'))]}).catch(e=>{console.error(e);process.exitCode=1;});
