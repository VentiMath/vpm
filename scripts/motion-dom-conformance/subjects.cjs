"use strict";
const assert = require('node:assert/strict');
require('../motion-utils-conformance/check-controls.cjs').check();
const { globals, stringSnapshot, objectSnapshot } = require('./subjects-fixture.cjs'); globals();
const vpm = require('../../packages/vmotion-dom');
let count = 0;
function compare(a,b,label) {
  if (typeof a === 'number' && typeof b === 'number') assert.ok(Math.abs(a-b) < 2e-5, `${label}: ${a} / ${b}`);
  else if (typeof a === 'string' && typeof b === 'string' && vpm.color.test(a) && vpm.color.test(b)) assert.deepEqual(vpm.color.parse(a),vpm.color.parse(b),label);
  else if (typeof a === 'string' && typeof b === 'string') {
    const numeric=/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/ig;
    assert.equal(a.replace(numeric,'#'),b.replace(numeric,'#'),label);
    const x=a.match(numeric)||[],y=b.match(numeric)||[];
    assert.equal(x.length,y.length,label);x.forEach((value,i)=>assert.ok(Math.abs(Number(value)-Number(y[i]))<2e-5,`${label}: ${a} / ${b}`));
  } else assert.equal(a,b,label);
  count++;
}
for (const [dom,framer] of [['motion-dom','framer-motion'],['motion-dom-app','framer-motion-app']]) {
  const api = require('../motion-utils-conformance/node_modules/'+dom);
  const entry = require.resolve('../motion-utils-conformance/node_modules/'+framer+'/dom');
  const upstream = require(entry);
  const objectRuntime = require(require.resolve('motion-dom', {paths:[require('node:path').dirname(entry)]}));
  for (const [from,to] of [['0px','20px'],['10%','90%'],['#000','#fff'],['rgba(0,0,0,.2)',['rgba(0,0,0,.2)','rgba(255,0,0,.7)','rgba(0,0,255,.5)']],['0px 2px #000','10px 20px #fff'],['1turn',[null,'2turn']]])
  for (const options of [{duration:1,ease:'linear'},{duration:.5,ease:'linear',delay:.1},{duration:.5,ease:'linear',repeat:1,repeatType:'reverse'},{duration:.5,ease:'linear',repeat:1,repeatType:'mirror'}])
  for (const owned of [false,true]) {
    const a=stringSnapshot(vpm,from,to,options,owned),b=stringSnapshot(api,from,to,options,owned),label=dom+' '+from+' '+JSON.stringify(options);
    assert.equal(a.updates.length,b.updates.length,label);
    a.updates.forEach((x,i)=>compare(x,b.updates[i],label));compare(a.duration,b.duration,label);compare(a.final,b.final,label);
  }
  for (const from of ['0px','#000']) {
    const to=from==='0px'?'20px':'#fff';
    const options={type:'spring',stiffness:100,damping:10};
    const a=stringSnapshot(vpm,from,to,options,true),b=stringSnapshot(api,from,to,options,true);
    assert.equal(a.updates.length,b.updates.length);a.updates.forEach((x,i)=>compare(x,b.updates[i],dom+' spring'));compare(a.duration,b.duration,dom+' spring duration');
  }
  for(const target of [{x:20},{x:[0,20],opacity:[0,1]},{backgroundColor:['#000','#fff']}])
  for(const options of [{duration:1,ease:'linear'},{duration:.5,ease:'linear',delay:.2},{duration:1,ease:'linear',repeat:1,repeatType:'reverse'}]) {
    const initial={x:0,opacity:0,backgroundColor:'#000'};
    const a=objectSnapshot(vpm,vpm.animate,initial,target,options),b=objectSnapshot(objectRuntime,upstream.animate,initial,target,options);
    a.forEach((row,i)=>Object.keys(row).forEach(key=>compare(row[key],b[i][key],dom+' object '+key)));
  }
}
console.log(`${count} single-string and default-object samples match current 14.7.0 and app 12.36.0.`);
