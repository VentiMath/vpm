"use strict";
const path = require('node:path'), assert = require('node:assert/strict'), root = path.resolve(__dirname,'..'), fixture=path.resolve(root,'../../scripts/motion-utils-conformance');
require(path.join(fixture,'check-controls.cjs')).check(); require('../../../scripts/check-bun.cjs');
const { effect }=require('../../../scripts/motion-dom-conformance/custom-effect-fixture.cjs');
const cases = [1,8].flatMap(count=>[
  {name:`bind, update, flush and detach ${count} custom values`, make(file) {
    require('../../../scripts/motion-dom-conformance/handoff-fixture.cjs').globals(); const api=require(file), e=effect(api), subject={custom:true}, values={}; let tick=0;
    for(let i=0;i<count;i++)values['v'+i]=api.motionValue(0);
    return ()=>{const off=e(subject,values); const n=++tick; for(let i=0;i<count;i++)values['v'+i].set(n); e.flush(subject); const result=subject['v'+(count-1)]===n;off();return result;};
  },validate:x=>assert.equal(x,true)},
  {name:`create, seek, flush and stop ${count} custom property animations`, make(file) {
    require('../../../scripts/motion-dom-conformance/handoff-fixture.cjs').globals(); const api=require(file), e=effect(api), subject={custom:true}, frames={};
    for(let i=0;i<count;i++){frames['v'+i]=[0,20]; subject['v'+i]=0;}
    const options={duration:1,ease:'linear',autoplay:false};api.time.set(1000);
    return ()=>{const a=api.animateEffectSubject(e,subject,frames,options);for(const x of a)x.time=.5;api.frameSteps.update.process({timestamp:1000,delta:16,isProcessing:true});e.flush(subject);const result=subject['v'+(count-1)];for(const x of a)x.stop();e.state(subject).release();api.frameSteps.read.process({timestamp:1000,delta:16,isProcessing:true});return result;};
  },validate:x=>assert.equal(x,10)},
]);
require('../../../scripts/bench-process.cjs').run({root,upstream:path.join(fixture,'node_modules/motion-dom/dist/cjs/index.js'),vpm:path.join(root,'index.cjs'),cases,
files:[...require('node:fs').readdirSync(root).filter(x=>x.endsWith('.cjs')),'package.json','PROVENANCE.json','bench/custom-effects.cjs','../vmotion-utils/index.cjs','../vmotion-utils/package.json','../../scripts/motion-dom-conformance/custom-effect-fixture.cjs','../../scripts/motion-dom-conformance/handoff-fixture.cjs','../../scripts/motion-utils-conformance/check-controls.cjs','../../scripts/motion-utils-conformance/provenance.json','../../scripts/motion-utils-conformance/node_modules/motion-dom','../../scripts/motion-utils-conformance/node_modules/motion-utils']}).catch(e=>{console.error(e);process.exitCode=1});
