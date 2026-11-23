"use strict";
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),upstream=require.resolve('../../../scripts/sisteransi-conformance/node_modules/sisteransi'),vpm=root+'/index.cjs';
function varying(operation){return lib=>{const api=require(lib);let i=0;return()=>operation(api,(i++&15)+1)}}
const cases=[
 {name:'Move cursor',make:varying((a,n)=>a.cursor.move(-n,n+1)),validate:v=>assert.match(v,/^\x1b\[\d+D\x1b\[\d+B$/)},
 {name:'Position cursor',make:varying((a,n)=>a.cursor.to(n,n+1)),validate:v=>assert.match(v,/^\x1b\[\d+;\d+H$/)},
 {name:'Clear 4–19 prompt lines',make:varying((a,n)=>a.erase.lines(n+3)),validate:v=>assert.ok(v.length>=31&&v.length<=151&&v.endsWith('\x1b[G'))},
 {name:'Clear 80–95 prompt lines',make:varying((a,n)=>a.erase.lines(n+79)),validate:v=>assert.ok(v.length>=639&&v.length<=759&&v.endsWith('\x1b[G'))},
 {name:'Next line and erase',make:varying((a,n)=>a.cursor.nextLine(n)+a.erase.down()),validate:v=>assert.match(v,/^(\x1b\[E)+\x1b\[J$/)}
];
require('../../../scripts/bench-process.cjs').run({root,upstream,vpm,cases,files:['index.cjs','package.json','bench/compare.cjs','../../scripts/sisteransi-conformance/package-lock.json',path.relative(root,upstream)]}).catch(e=>{console.error(e);process.exitCode=1});
