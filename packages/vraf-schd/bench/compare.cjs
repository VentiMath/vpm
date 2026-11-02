'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
function make(dir,mode){
 const schedule=require(dir);let frame=null,id=0,result=0;
 global.requestAnimationFrame=fn=>{frame=fn;return ++id};global.cancelAnimationFrame=()=>{frame=null};
 const fn=schedule(value=>{result=value});
 return()=>{
  fn(1);
  if(mode==='coalesce')for(let i=2;i<=16;i++)fn(i);
  if(mode==='cancel'){fn.cancel();fn(2)}
  const run=frame;frame=null;run(0);return result;
 };
}
const cases=['single','coalesce','cancel'].map(mode=>({name:mode+' frame cycle',make:dir=>make(dir,mode),validate:value=>assert.equal(value,mode==='coalesce'?16:mode==='cancel'?2:1)}));
require('../../../scripts/bench-process.cjs').run({root,upstream:path.resolve(root,'../../scripts/raf-schd-conformance/node_modules/raf-schd'),vpm:root,cases,files:['package.json','index.cjs','bench/compare.cjs','../../scripts/raf-schd-conformance/package-lock.json','../../scripts/raf-schd-conformance/node_modules/raf-schd']}).catch(error=>{console.error(error);process.exitCode=1});
