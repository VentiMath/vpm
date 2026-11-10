"use strict";
const assert = require('node:assert/strict');
require('../motion-utils-conformance/check-controls.cjs').check();
require('./handoff-fixture.cjs').globals();
const upstream = require('../motion-utils-conformance/node_modules/motion-dom'), vpm = require('../../packages/vmotion-dom');
const { bindingSnapshot, animationSnapshot } = require('./custom-effect-fixture.cjs');
let count = 0;
for (const n of [1,2,8,32]) for (const step of [false, true]) { assert.deepEqual(bindingSnapshot(vpm,n,step), bindingSnapshot(upstream,n,step)); count++; }
for (const frames of [{x:20}, {x:[0,20]}, {opacity:[0,.2,1]}, {x:[null,20],opacity:[null,1]}, {backgroundColor:['#000','#fff']}])
for (const options of [{duration:1,ease:'linear'}, {duration:.5,ease:'linear',delay:.2}, {duration:1,ease:'linear',x:{duration:2,ease:'linear',autoplay:false}}, {duration:1,ease:'linear',repeat:1,repeatType:'reverse'}]) {
  const a = animationSnapshot(vpm,frames,options), b = animationSnapshot(upstream,frames,options);
  for (let i = 0;i<a.length;i++) for (const key of Object.keys(a[i])) {
    if (typeof a[i][key] === 'number') assert.ok(Math.abs(a[i][key]-b[i][key])<1e-10,`${JSON.stringify(frames)} ${JSON.stringify(options)} ${i} ${key}: ${a[i][key]} / ${b[i][key]}`);
    else if (key === "backgroundColor") assert.deepEqual(vpm.color.parse(a[i][key]), vpm.color.parse(b[i][key]));
    else assert.equal(a[i][key],b[i][key]); count++;
  }
}
console.log(`${count} custom effect binding, release and animation comparisons match Motion DOM 14.7.0.`);
