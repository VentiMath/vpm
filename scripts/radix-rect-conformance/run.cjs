'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const variant=process.argv[2]||'vpm',fixed=variant==='vpm';
function setup(){const clock=require('./clock.cjs')(),file=fixed?path.resolve(__dirname,'../../packages/vradix-rect/index.cjs'):require.resolve('@radix-ui/rect'),module={exports:{}};new Function('require','module','exports',fs.readFileSync(file,'utf8'))(createRequire(file),module,module.exports);return {clock,observe:module.exports.observeElementRect};}
const rect=(x=0)=>({x,y:0,left:x,right:x+10,top:0,bottom:20,width:10,height:20});
{
 const {clock,observe}=setup(),calls=[],reads=[],a={getBoundingClientRect(){reads.push('a');return rect(1)}},b={getBoundingClientRect(){reads.push('b');return rect(2)}};
 const off=observe(a,r=>calls.push([r.left,reads.length])),offB=observe(b,r=>calls.push([r.left,reads.length]));assert.deepEqual(calls,[]);assert.equal(clock.size,1);clock.tick();assert.deepEqual(calls,[[1,2],[2,2]]);clock.tick();assert.equal(calls.length,2);
 let immediate;const off2=observe(a,r=>immediate=r.left);assert.equal(immediate,1);off2();off();offB();assert.equal(clock.size,0);
}
{
 const {clock,observe}=setup();let off=observe({getBoundingClientRect:()=>rect()},()=>off());clock.tick();assert.equal(clock.size,fixed?0:1,'final callback cleanup');
}
{
 const {clock,observe}=setup(),box=rect(),element={getBoundingClientRect:()=>box};let count=0;
 const first=observe(element,()=>count++);clock.tick();box.left=2;clock.tick();assert.equal(count,fixed?2:1,'mutable rectangle');first();
}
{
 const {clock,observe}=setup();let n=0;const element={getBoundingClientRect:()=>rect()},fn=()=>n++,a=observe(element,fn),b=observe(element,fn);a();a();clock.tick();assert.equal(n,fixed?2:1,'duplicate callback subscriptions');b();
}
{
 const {clock,observe}=setup();let n=0,off;off=observe({getBoundingClientRect:()=>rect()},()=>{throw Error('callback')});const other=observe({getBoundingClientRect:()=>rect()},()=>n++);assert.throws(()=>clock.tick(),/callback/);assert.equal(n,fixed?1:0);assert.equal(clock.size,fixed?1:0);off();other();
}
if(fixed){
 const {clock,observe}=setup(),element={getBoundingClientRect:()=>rect()};let b=()=>{},calls=[];
 const a=observe(element,()=>{calls.push('a');b();});b=observe(element,()=>calls.push('b'));calls=[];clock.tick();assert.deepEqual(calls,['a']);a();assert.equal(clock.size,0);
 const keep=observe(element,()=>{});assert.throws(()=>observe(element,()=>{throw Error('sync')}),/sync/);keep();assert.equal(clock.size,0);
 let added=false,offNew;const first=observe(element,()=>{if(!added){added=true;offNew=observe(element,()=>calls.push('new'))}});calls=[];clock.tick();assert.deepEqual(calls,['new']);first();offNew();assert.equal(clock.size,0);
 const bad=observe({getBoundingClientRect(){throw Error('measure')}},()=>{});let good=0;const next=observe(element,()=>good++);assert.throws(()=>clock.tick(),/measure/);assert.equal(good,1);bad();next();assert.equal(clock.size,0);
}
// Run the unchanged real React hook, routing only its rectangle import.
{
 const {JSDOM}=require('jsdom'),dom=new JSDOM('<div id="root"></div>');globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const {clock,observe}=setup(),React=require('react'),{createRoot}=require('react-dom/client');
 const file=require.resolve('@radix-ui/react-use-rect'),module={exports:{}},local=createRequire(file);new Function('require','module','exports',fs.readFileSync(file,'utf8'))(name=>name==='@radix-ui/rect'?{observeElementRect:observe}:local(name),module,module.exports);
 let value;const box=rect();const element={getBoundingClientRect:()=>({...box})};function Child(){value=module.exports.useRect(element);return React.createElement('b',null,value?.left)}
 const root=createRoot(document.getElementById('root'));React.act(()=>root.render(React.createElement(Child)));assert.equal(value,undefined);React.act(()=>clock.tick());assert.equal(value.left,0);box.left=12;React.act(()=>clock.tick());assert.equal(value.left,12);React.act(()=>root.unmount());assert.equal(clock.size,0);dom.window.close();
}
console.log(variant+': scheduling, measurement, callback controls and unchanged React useRect caller pass');
