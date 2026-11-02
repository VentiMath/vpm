'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..');
const edges={top:10,left:20,bottom:90,right:220},spacing={top:2,right:3,bottom:4,left:5};
const styles=Object.fromEntries(['margin','padding','border'].flatMap(kind=>['Top','Right','Bottom','Left'].map(side=>[kind+side+(kind==='border'?'Width':''),'2.5px'])));
const cases=[
 {name:'rectangle from four edges',make:file=>{const b=require(file);return()=>b.getRect(edges)},validate:x=>assert.equal(x.width,200)},
 {name:'create box with explicit spacing',make:file=>{const b=require(file),args={borderBox:edges,margin:spacing,border:spacing,padding:spacing};return()=>b.createBox(args)},validate:x=>assert.equal(x.contentBox.width,184)},
 {name:'create box with default spacing',make:file=>{const b=require(file),args={borderBox:edges};return()=>b.createBox(args)},validate:x=>assert.equal(x.contentBox.width,200)},
 {name:'parse computed style and calculate box',make:file=>{const b=require(file);return()=>b.calculateBox(edges,styles)},validate:x=>assert.equal(x.contentBox.width,190)},
 {name:'calculate client and scrolled page boxes',make:file=>{const b=require(file),scroll={x:17,y:23};return()=>b.withScroll(b.calculateBox(edges,styles),scroll)},validate:x=>assert.equal(x.borderBox.top,33)},
];
const harness=require('../../../scripts/bench-process.cjs');
const options={root,upstream:path.resolve(root,'../../scripts/box-model-conformance/node_modules/css-box-model'),vpm:root,files:['package.json','index.cjs','bench/compare.cjs','../vtiny-invariant/index.cjs','../../scripts/box-model-conformance/package-lock.json','../../scripts/box-model-conformance/node_modules/css-box-model','../../scripts/box-model-conformance/node_modules/tiny-invariant']};
(async()=>{
 if(process.env.VPM_BENCH_WORKER){
  const index=Number(process.env.VPM_BOX_CASE);assert(Number.isInteger(index)&&index>=0&&index<cases.length);
  await harness.run({...options,cases:[cases[index]]});return;
 }
 // Isolate cases as well as implementations: one case per fresh worker means
 // earlier default/explicit shape feedback cannot affect the parsing case.
 const directory=process.env.RESULT_DIR||path.join(__dirname,'results'),runtime=process.versions.bun?'bun':'node';
 require('node:fs').mkdirSync(directory,{recursive:true});
 for(let i=0;i<cases.length;i++){
  process.env.VPM_BOX_CASE=String(i);process.env.OUTPUT=path.join(directory,`${runtime}-${i}.json`);
  await harness.run({...options,cases:[cases[i]]});
 }
})().catch(error=>{console.error(error);process.exitCode=1});
