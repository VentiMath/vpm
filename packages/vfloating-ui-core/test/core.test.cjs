'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const own=require('..'),upstream=require('../../../scripts/floating-core-conformance/node_modules/@floating-ui/core'),{fixture,run}=require('../../../scripts/floating-core-conformance/scenarios.cjs');
test('all exports and 624 positioning/middleware cases agree with core 1.8.0',async()=>{
 assert.deepEqual(Object.keys(own).sort(),Object.keys(upstream).sort());
 for(let index=0;index<48;index++)for(const name of Object.keys(fixture(own,index).sets))assert.deepEqual(await run(own,index,name,index%2===0),await run(upstream,index,name,index%2===0),name+' case '+index);
});
test('custom overflow hook and inherited platform methods are preserved',async()=>{
 for(const api of [own,upstream]){
  const f=fixture(api,4);let calls=0;
  await api.computePosition(f.reference,f.floating,{platform:f.platform,middleware:[{name:'receiver',fn(){assert.equal(this,undefined);return {};}}]});
  f.platform.detectOverflow=()=>{calls++;return {left:10,right:-10,top:0,bottom:0};};
  await api.computePosition(f.reference,f.floating,{platform:f.platform,middleware:[api.shift()]});assert.equal(calls,1);
  delete f.platform.detectOverflow;
  const operation=api.computePosition(f.reference,f.floating,{platform:Object.create(f.platform),middleware:[api.shift()]});
  if(api===own)assert.ok(Number.isFinite((await operation).x));else await assert.rejects(operation,TypeError);
 }
});
test('middleware plan is captured before awaits, including names and reset functions',async()=>{
 for(const api of [own,upstream]){
  const f=fixture(api,0);let release;f.platform.isRTL=()=>new Promise(resolve=>release=resolve);
  const step={name:'initial',fn:({x})=>({x:x+1})},middleware=[step];
  const result=api.computePosition(f.reference,f.floating,{platform:f.platform,middleware});
  step.name='changed';step.fn=({x})=>({x:x+100});middleware.push({name:'appended',fn:()=>({x:999})});release(false);
  const value=await result;
  if(api===own){assert.deepEqual(Object.keys(value.middlewareData),['initial']);assert.notEqual(value.x,999);}else assert.equal(value.x,999);
 }
});
test('middleware names cannot replace the data prototype; resets stop after 50',async()=>{
 for(const api of [own,upstream]){
  const f=fixture(api,0),result=await api.computePosition(f.reference,f.floating,{platform:f.platform,middleware:[{name:'__proto__',fn:()=>({data:{poisoned:true}})}]});
  assert.equal(Object.hasOwn(result.middlewareData,'__proto__'),api===own);
  assert.equal(Object.getPrototypeOf(result.middlewareData)===Object.prototype,api===own);
 }
 let calls=0,after=0;const f=fixture(own,0);
 await own.computePosition(f.reference,f.floating,{platform:f.platform,middleware:[false,null,{name:'cycle',fn:()=>{calls++;return {reset:true};}},{name:'after',fn:()=>{after++;return {};}}]});
 assert.equal(calls,51);assert.equal(after,1);
});
test('large inline ranges do not spread a rect list onto the call stack',async()=>{
 const rect=own.rectToClientRect({x:1,y:2,width:10,height:20});
 const f=fixture(own,0);f.platform.getClientRects=()=>Array(150000).fill(rect);
 const result=await own.computePosition(f.reference,f.floating,{platform:f.platform,middleware:[own.inline()]});assert.ok(Number.isFinite(result.x));
 const control=await upstream.computePosition(f.reference,f.floating,{platform:f.platform,middleware:[upstream.inline()]}).catch(error=>error);
 if(control instanceof Error)assert.ok(control instanceof RangeError);else assert.deepEqual(result,control);
});
test('CJS/ESM identity and retained upstream tests',async()=>{
 const esm=await import('../runtime.mjs');for(const key of Object.keys(own))assert.equal(own[key],esm[key]);
 const result=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/floating-core-conformance/run.cjs')],{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);
});
