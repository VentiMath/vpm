"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),{snapshot}=require("./selector-fixture.cjs");
require("../motion-utils-conformance/check-controls.cjs").check();
const vpm=path.resolve(__dirname,"../../packages/vmotion-dom/index.cjs");
let count=0;
for(const pkg of ["framer-motion","framer-motion-app"]) {
  const upstream=require.resolve("../motion-utils-conformance/node_modules/"+pkg+"/dom");
  for(const size of [1,3,10]) for(const target of [{opacity:[0,1]},{opacity:[0,1],x:[0,20]},{opacity:[0,.25,1],scale:[1,1.5]}])
  for(const opts of [{duration:1,ease:"linear"},{duration:.5,ease:"linear",delay:.2},{duration:1,ease:"linear",delay:(i,n)=>i/n*.3},{duration:1,ease:"linear",opacity:{duration:.3,delay:.1,ease:"linear"}}]) {
    const actual=snapshot(vpm,size,target,opts),expected=snapshot(upstream,size,target,opts);
    for (let t=0;t<actual.length;t++) for(let i=0;i<size;i++) {
      const a=actual[t][i], b=expected[t][i];
      assert.ok(Math.abs(a.opacity-b.opacity)<1e-12, `${pkg} opacity ${size} ${JSON.stringify(target)} ${JSON.stringify(opts)} t${t} i${i}: ${a.opacity} vs ${b.opacity}`);
      const number=/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/ig;
      const av=a.transform.match(number)||[], bv=b.transform.match(number)||[];
      assert.equal(a.transform.replace(number,"#"),b.transform.replace(number,"#"));
      assert.equal(av.length,bv.length);
      av.forEach((v,j)=>assert.ok(Math.abs(Number(v)-Number(bv[j]))<1e-10, `${pkg} transform`));
    }
    count+=size*8;
  }
}
console.log(`${count} selector, collection, stagger and per-property playback comparisons match current/app public animate().`);
