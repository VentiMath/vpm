'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.VCLASSNAMES_ENTRY||path.resolve(__dirname,'..');
const up=path.resolve(__dirname,'../../../scripts/classnames-conformance/node_modules/classnames');
const entries=['index','bind','dedupe'];
for(const entry of entries)test(entry+' matches pinned output across dictionaries, arrays and scalar combinations',()=>{
 const own=require(root+'/'+entry+'.cjs'),control=require(up+'/'+entry+'.js');
 const scalars=[null,undefined,false,true,0,1,-1,NaN,'','x','x y',' a  b ',Symbol('ignored'),()=>{}, {x:true,y:false},Object.assign(Object.create({inherited:true}),{own:1}),{toString(){return 'custom'}},new Date(0),new String('xy')];
 const binding={x:'hashed-x',own:'hashed-own'};let count=0;
 for(const a of scalars)for(const b of scalars)for(const c of [[],['nested',0,[b]],{last:true},a]){const args=[a,b,c];assert.equal(own.apply(binding,args),control.apply(binding,args));count++;}
 assert(count>1400);assert.equal(own.default,own);
});
test('null-prototype records, shadowed methods and prototype-name classes are safe',()=>{for(const entry of entries){const own=require(root+'/'+entry+'.cjs');assert.equal(own(Object.assign(Object.create(null),{active:true})),'active');assert.equal(own({toString:true}),'toString');assert.equal(own(JSON.parse('{"__proto__":true,"constructor":true}')),'__proto__ constructor');}assert.equal(require(root+'/bind.cjs').call({},'constructor'),'constructor');});
test('deep arrays and cycles do not depend on call stack limits',()=>{for(const entry of entries){const own=require(root+'/'+entry+'.cjs');let value='deep';for(let i=0;i<20000;i++)value=[value];assert.equal(own(value),'deep');const cycle=[];cycle.push(cycle);assert.throws(()=>own(cycle),{name:'TypeError'});const shared=['x'];assert.equal(own([shared,shared]),entry==='dedupe'?'x':'x x');}});
test('dedupe preserves ordering, later exclusion and later re-enabling',()=>{const own=require(root+'/dedupe.cjs');assert.equal(own('x y x',{x:false},'z'),'y z');assert.equal(own('x y',{x:false},'x'),'x y');assert.equal(own(3,1,2,'x'),'1 2 3 x');});
test('bound CSS modules retain unknown class names and do not mutate input',()=>{const bind=require(root+'/bind.cjs'),mapping=Object.freeze({active:'a',known:'k'}),input=Object.freeze({known:true,no:false});assert.equal(bind.bind(mapping)('active',input,['unknown']),'a k unknown');});
test('cached own-property checks preserve shadowed fields and live bindings',()=>{
 for(const entry of entries){const own=require(root+'/'+entry+'.cjs');assert.equal(own({hasOwnProperty:true,visible:true}),'hasOwnProperty visible');}
 const binding=Object.assign(Object.create({hidden:'wrong'}),{active:'a'}),fn=require(root+'/bind.cjs').bind(binding);
 assert.equal(fn('active','hidden'),'a hidden');binding.active='b';assert.equal(fn('active'),'b');delete binding.active;assert.equal(fn('active'),'active');
});
test('deep traversal terminates if an array getter shortens the active array',()=>{
 for(const entry of entries){const leaf=['last'];Object.defineProperty(leaf,0,{get(){leaf.length=0;return 'last'}});let value=leaf;for(let i=0;i<40;i++)value=[value];assert.equal(require(root+'/'+entry+'.cjs')(value),'last');}
});
