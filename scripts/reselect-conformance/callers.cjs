'use strict';
const assert=require('node:assert/strict'),dir=require('./build.cjs');
function trace(api){
 let calculations=0;const shared={},base={__cacheKey__:shared,items:[{id:1,kind:'amc'},{id:2,kind:'arml'}]};
 const filtered=api.createSelectorMemoized(s=>s.items,(items,kind)=>{calculations++;return items.filter(x=>x.kind===kind)}),states=[base,{...base}, {...base,items:[...base.items]}, {items:base.items}];
 const references=[],out=[];
 for(let i=0;i<80;i++){const state=states[i%4],kind=i%3?'amc':'arml',value=filtered(state,kind);let id=references.indexOf(value);if(id<0){id=references.length;references.push(value)}out.push({id,value,calculations});}
 const plain=api.createSelector(s=>s.items,(items,id)=>items.find(x=>x.id===id));out.push(plain(base,2));return out;
}
const own=trace(require(dir+'/vpm.cjs'));assert.deepEqual(own,trace(require(dir+'/current.cjs')));assert.deepEqual(own,trace(require(dir+'/app.cjs')));console.log('81 unchanged MUI X selector calls match current/app values, reference reuse and computation counts');
