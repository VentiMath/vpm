'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),api=require('..');
test('baggage snapshots caller entry records at construction',()=>{
 const entry={value:'before'},bag=api.propagation.createBaggage({key:entry});entry.value='after';assert.equal(bag.getEntry('key').value,'before');
});
test('baggage updates snapshot records and retain opaque metadata identity',()=>{
 const metadata=api.baggageEntryMetadataFromString('opaque'),entry={value:'before',metadata},a=api.propagation.createBaggage(),b=a.setEntry('key',entry);entry.value='after';assert.equal(a.getEntry('key'),undefined);assert.equal(b.getEntry('key').value,'before');assert.equal(b.getEntry('key').metadata,metadata);
});
test('enumerated baggage entries cannot mutate original or derived baggage',()=>{
 const a=api.propagation.createBaggage({one:{value:'1'},two:{value:'2'}}),b=a.setEntry('three',{value:'3'}),entries=a.getAllEntries();entries[0][1].value='bad';entries[1][0]='renamed';assert.equal(a.getEntry('one').value,'1');assert.equal(b.getEntry('one').value,'1');assert.equal(a.getEntry('two').value,'2');
 const c=b.removeEntries('one','two');assert.deepEqual(c.getAllEntries(),[['three',{value:'3'}]]);assert.equal(b.getAllEntries().length,3);assert.deepEqual(c.clear().getAllEntries(),[]);
});
test('baggage entry copies treat an own __proto__ field as data',()=>{
 const entry=JSON.parse('{"value":"ok","__proto__":{"injected":true}}'),bag=api.propagation.createBaggage({key:entry});const output=bag.getEntry('key');assert.equal(Object.getPrototypeOf(output),Object.prototype);assert.ok(Object.hasOwn(output,'__proto__'));assert.equal(output.injected,undefined);
});
test('trace state preserves immutable updates and front ordering',()=>{
 const a=api.createTraceState('a=1,b=2'),b=a.set('b','3'),c=b.set('c','4');assert.equal(a.serialize(),'a=1,b=2');assert.equal(b.serialize(),'b=3,a=1');assert.equal(c.serialize(),'c=4,b=3,a=1');assert.equal(c.unset('b').serialize(),'c=4,a=1');assert.equal(c.serialize(),'c=4,b=3,a=1');for(let i=0;i<100;i++)assert.equal(c.serialize(),'c=4,b=3,a=1');
});
test('trace state rejects invalid update fields without changing the original',()=>{
 const a=api.createTraceState('a=1');for(const[key,value]of [['Upper','1'],['bad.key','1'],['x','bad\r\nheader'],['x','a,b'],['x','a=b'],['x',''],['x','ends '],['x','a'.repeat(257)],['x',12],[null,'a']])assert.equal(a.set(key,value),a);assert.equal(a.serialize(),'a=1');
});
test('overflow parsing keeps the first 32 valid entries in wire order',()=>{
 const parts=Array.from({length:33},(_,i)=>`a${i}=${i}`),a=api.createTraceState(parts.join(','));assert.equal(a.serialize(),parts.slice(0,32).join(','));assert.equal(a.get('a32'),undefined);assert.equal(a.set('new','value'),a);assert.equal(a.set('a31','new').serialize().split(',')[0],'a31=new');
});
test('trace-state length accounting stays correct after replacement and deletion',()=>{
 const raw='a='+'1'.repeat(252)+',b='+'2'.repeat(251),a=api.createTraceState(raw),full=a.set('c','x');assert.equal(full.serialize().length,512);assert.equal(full.set('c','xx'),full);assert.equal(full.unset('c').serialize(),raw);assert.equal(full.unset('b').set('d','ok').serialize(),'d=ok,c=x,a='+'1'.repeat(252));assert.equal(api.createTraceState('a=1').unset('a').set('b','2').serialize(),'b=2');
});
test('native ESM exposes the same corrected behavior and experimental API',async()=>{
 const esm=await import('../dist/index.mjs'),experimental=await import('../dist/experimental/index.mjs');assert.equal(typeof experimental.wrapTracer,'function');assert.equal(esm.createTraceState('a=1').set('bad','\n').serialize(),'a=1');const input={value:'1'},bag=esm.propagation.createBaggage({a:input});input.value='2';assert.equal(bag.getEntry('a').value,'1');assert.equal(esm.createContextKey('vpm-fixture'),api.createContextKey('vpm-fixture'));
});
