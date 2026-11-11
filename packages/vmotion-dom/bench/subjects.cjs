"use strict";
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/motion-utils-conformance');
require(path.join(fixture,'check-controls.cjs')).check();require('../../../scripts/check-bun.cjs');
const {load}=require('../../../scripts/motion-dom-conformance/selector-fixture.cjs');
const cases=[
 ...[['#000','#fff','rgba(180, 180, 180, 1)'],['0px','20px','10px'],['0px 2px #000','10px 20px #fff','5px 11px rgba(180, 180, 180, 1)'],[0,20,10]].map(([from,to,expected])=>({
  name:`create, sample and stop ${typeof from==='number'?'numeric control':from==='#000'?'color':from==='0px'?'unit string':'complex string'}`,
  make(file){const {runtime:a}=load(file);let tick,latest;const options={duration:1,ease:'linear',driver:fn=>(tick=fn,{now:()=>1000,start(){},stop(){}}),onUpdate:x=>latest=x};a.time.set(1000);return()=>{a.time.set(1000);const c=a.animateSingleValue(from,to,options);tick(1000);tick(1500);c.stop();return latest;};},validate:x=>assert.equal(x,expected),
 })),
 ...[1,8].map(count=>({
  name:`create, seek, flush and stop ${count} default object properties`,
  make(file){const {api,runtime:a}=load(file),subject={},frames={};for(let i=0;i<count;i++){subject['v'+i]=0;frames['v'+i]=[0,20];}a.time.set(1000);const options={duration:1,ease:'linear',autoplay:false};return()=>{const g=api.animate(subject,frames,options);void g.duration;g.time=.5;a.frameSteps.update.process({timestamp:1000,delta:16,isProcessing:true});a.propEffect.flush(subject);const out=subject['v'+(count-1)];g.stop();a.propEffect.state(subject).release();a.frameSteps.read.process({timestamp:1000,delta:16,isProcessing:true});return out;};},validate:x=>assert.equal(x,10),
 })),
];
require('../../../scripts/bench-process.cjs').run({root,upstream:require.resolve(path.join(fixture,'node_modules/framer-motion/dom')),vpm:path.join(root,'index.cjs'),cases,
files:[...fs.readdirSync(root).filter(x=>x.endsWith('.cjs')),'package.json','PROVENANCE.json','bench/subjects.cjs','../vmotion-utils/index.cjs','../vmotion-utils/package.json','../../scripts/motion-dom-conformance/selector-fixture.cjs','../../scripts/motion-dom-conformance/handoff-fixture.cjs','../../scripts/motion-utils-conformance/check-controls.cjs','../../scripts/motion-utils-conformance/provenance.json','../../scripts/motion-utils-conformance/node_modules/framer-motion','../../scripts/motion-utils-conformance/node_modules/motion-dom','../../scripts/motion-utils-conformance/node_modules/motion-utils']}).catch(e=>{console.error(e);process.exitCode=1});
