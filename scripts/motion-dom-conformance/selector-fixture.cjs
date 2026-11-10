"use strict";
const path = require("node:path"), helper = require("./handoff-fixture.cjs");
function load(file) {
  helper.globals(); global.NodeList = class {};
  const vpm = file.includes("packages/vmotion-dom");
  const api = require(file);
  const runtime = vpm ? api : require(require.resolve("motion-dom", {paths:[path.dirname(file)]}));
  return {api,runtime};
}
function snapshot(file, count, target, options) {
  const {api,runtime} = load(file), nodes=Array.from({length:count},()=>helper.node());
  runtime.time.set(1000);
  const selected = {querySelectorAll:()=>nodes}; global.document=selected;
  const group=api.animate(".item",target,{...options,autoplay:false});
  runtime.flushKeyframeResolvers();
  const samples=[];
  let timestamp=1000;
  for(const time of [0,.1,.25,.5,.75,1,1.5,2]) {
    timestamp+=16; runtime.time.set(timestamp);
    group.time=time;
    for(const phase of ["read","resolveKeyframes","update","render"]) runtime.frameSteps[phase].process({timestamp,delta:16,isProcessing:true});
    samples.push(nodes.map(n=>({opacity:Number(n.style.opacity ?? 0),transform:n.style.transform || "none"})));
  }
  group.stop(); for(const n of nodes) runtime.releaseElement?.(n);
  return samples;
}
module.exports={load,snapshot};
