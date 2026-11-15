'use strict';
process.env.NODE_ENV='production';
const path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'..'),fixture=path.resolve(root,'../../scripts/reselect-conformance'),cases=[];
for(const version of ['current','app'])for(const kind of ['lru-hit','lru-miss','weak-hit','selector-hit','changed-state','mui-selector'])cases.push({
 name:version+' '+kind,
 make(file){const own=file===root,a=require(own?root:fixture+'/node_modules/'+(version==='current'?'reselect':'reselect-app'));
  if(kind==='lru-hit'){const fn=a.lruMemoize((a,b)=>a+b);fn(2,3);return()=>fn(2,3)}
  if(kind==='lru-miss'){const fn=a.lruMemoize(a=>a+1);let i=0;return()=>fn(i++%2)}
  if(kind==='weak-hit'){const key={},fn=a.weakMapMemoize((s,n)=>n+1);fn(key,2);return()=>fn(key,2)}
  const items=[{id:1,kind:'amc'},{id:2,kind:'arml'}],state={items};
  if(kind==='mui-selector'){const api=require(fixture+'/node_modules/.vpm/'+(own?'vpm':version)+'.cjs'),fn=api.createSelectorMemoized(s=>s.items,(items,kind)=>items.filter(x=>x.kind===kind));fn(state,'amc');return()=>fn(state,'amc')}
  const fn=a.createSelector([s=>s.items],items=>items.filter(x=>x.kind==='amc'));fn(state);return kind==='selector-hit'?()=>fn(state):()=>fn({items});
 },
 validate(value){if(kind==='lru-hit')assert.equal(value,5);else if(kind==='lru-miss')assert.ok(value===1||value===2);else if(kind==='weak-hit')assert.equal(value,3);else assert.deepEqual(value,[{id:1,kind:'amc'}]);}
});
require('../../../scripts/bench-process.cjs').run({root,upstream:fixture+'/node_modules/reselect',vpm:root,cases,files:['index.cjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/reselect-conformance/package-lock.json','../../scripts/reselect-conformance/build.cjs','../../scripts/reselect-conformance/node_modules/reselect','../../scripts/reselect-conformance/node_modules/reselect-app','../../scripts/reselect-conformance/node_modules/@mui/x-internals/store','../../scripts/reselect-conformance/node_modules/.vpm']}).catch(e=>{console.error(e);process.exitCode=1;});
