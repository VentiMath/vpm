"use strict";
const path=require("node:path"),assert=require("node:assert/strict"),fs=require("node:fs"),root=path.resolve(__dirname,".."),fixture=path.resolve(root,"../../scripts/motion-utils-conformance"),helper=require("../../../scripts/motion-dom-conformance/selector-fixture.cjs"),nodes=require("../../../scripts/motion-dom-conformance/handoff-fixture.cjs");
require(path.join(fixture,"check-controls.cjs")).check();require("../../../scripts/check-bun.cjs");
require("../../../scripts/bench-process.cjs").run({root,upstream:require.resolve(path.join(fixture,"node_modules/framer-motion/dom")),vpm:path.join(root,"index.cjs"),cases:[1,8,32].map(count=>({
  name:`select, animate, seek and stop ${count} elements`,
  make(file){const {api,runtime}=helper.load(file),elements=Array.from({length:count},()=>nodes.node());global.document={querySelectorAll:()=>elements};let timestamp=1000;
    const target={opacity:[0,1],x:[0,20]},options={duration:1,ease:"linear",autoplay:false,delay:(i,n)=>i/n*.1};
    return ()=>{timestamp+=16;runtime.time.set(timestamp);const group=api.animate(".item",target,options);runtime.flushKeyframeResolvers();group.time=.5;
      for(const phase of ["read","resolveKeyframes","update","render"])runtime.frameSteps[phase].process({timestamp,delta:16,isProcessing:true});
      const value=Number(elements[0].style.opacity);group.stop();return value;};},validate:value=>assert.equal(value,.5)
})),files:[...fs.readdirSync(root).filter(n=>n.endsWith(".cjs")),"package.json","PROVENANCE.json","bench/selectors.cjs","../vmotion-utils/index.cjs","../vmotion-utils/package.json","../../scripts/motion-dom-conformance/selector-fixture.cjs","../../scripts/motion-dom-conformance/handoff-fixture.cjs","../../scripts/motion-utils-conformance/check-controls.cjs","../../scripts/motion-utils-conformance/provenance.json","../../scripts/motion-utils-conformance/node_modules/motion-dom","../../scripts/motion-utils-conformance/node_modules/motion-utils","../../scripts/motion-utils-conformance/node_modules/framer-motion"]}).catch(error=>{console.error(error);process.exitCode=1});
