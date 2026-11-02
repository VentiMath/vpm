'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const equal=require('..'),upstream=require('../../../scripts/fast-compare-conformance/node_modules/react-fast-compare');
test('module identity and primitives',async()=>{assert.equal((await import('../runtime.mjs')).default,equal);for(const [a,b] of [[NaN,NaN],[0,-0],[1,1],['x','y'],[undefined,null]])assert.equal(equal(a,b),upstream(a,b));});
test('DataView compares visible bytes without hanging',()=>{
 const a=new DataView(Uint8Array.from([0,1,2,0]).buffer,1,2),b=new DataView(Uint8Array.from([1,2]).buffer);
 assert.equal(equal(a,b),true);b.setUint8(1,3);assert.equal(equal(a,b),false);
 const original=spawnSync(process.execPath,['-e',`require(${JSON.stringify(require.resolve('../../../scripts/fast-compare-conformance/node_modules/react-fast-compare'))})(new DataView(new ArrayBuffer(1)),new DataView(new ArrayBuffer(1)))`],{timeout:750});assert.equal(original.error?.code,'ETIMEDOUT');
});
test('ArrayBuffer data is significant; typed-array numeric semantics are preserved',()=>{
 const a=Uint8Array.from([1]).buffer,b=Uint8Array.from([2]).buffer;assert.equal(upstream(a,b),true);assert.equal(equal(a,b),false);
 assert.equal(equal(new Float64Array([NaN]),new Float64Array([NaN])),false);assert.equal(equal(new Float64Array([-0]),new Float64Array([0])),true);
});
test('deep and cyclic props terminate; changed values are not hidden',()=>{
 let a={v:1},b={v:1};for(let i=0;i<20000;i++){a={next:a};b={next:b};}assert.equal(equal(a,b),true);
 const x={v:1},y={v:1};x.self=x;y.self=y;assert.equal(equal(x,y),true);y.v=2;assert.equal(equal(x,y),false);
 const shared={v:1};assert.equal(equal({a:shared,b:shared},{a:{v:1},b:{v:1}}),true);
 const m=new Map(),n=new Map();m.set('self',m);n.set('self',n);assert.equal(equal(m,n),true);
});
test('comparison does not swallow errors merely containing stack or recursion',()=>{
 const error=Error('application stack configuration');const a={get x(){throw error;}},b={x:1};assert.throws(()=>equal(a,b),e=>e===error);
 const warn=console.warn;console.warn=()=>{};try{assert.equal(upstream(a,b),false);}finally{console.warn=warn;}
});
test('ordinary generated props match upstream; React owners are excluded',()=>{
 let seed=42;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)%100);
 for(let i=0;i<3000;i++){const a={value:rand(),rows:[rand(),{label:String(rand())}]},b=structuredClone(a);if(i%2)b.rows[1].label+='x';assert.equal(equal(a,b),upstream(a,b));}
 const a={$$typeof:Symbol.for('react.transitional.element'),props:{x:1},_owner:{a:1}},b={...a,_owner:{a:2}};assert.equal(equal(a,b),true);b.props={x:2};assert.equal(equal(a,b),false);
});
