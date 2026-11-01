'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../../../scripts/floating-react-dom-conformance/prepare.cjs');
const api=require('..'),original=require('../../../scripts/floating-react-dom-conformance/node_modules/@floating-ui/react-dom');
test('public exports and module identity',async()=>{assert.deepEqual(Object.keys(api).sort(),Object.keys(original).sort());const esm=await import('../runtime.mjs');for(const key of Object.keys(api))assert.equal(esm[key],api[key]);});
test('middleware options retain dependency lists without altering geometry',async()=>{
 for(const name of ['offset','shift','limitShift','flip','size','autoPlacement','hide','inline','arrow']){
  const options=name==='arrow'?{element:{current:null}}:undefined,deps=[1];
  assert.deepEqual(api[name](options,deps).options,[options,deps]);
 }
 const platform={isRTL:()=>false,getElementRects:()=>({reference:{x:0,y:0,width:20,height:10},floating:{x:0,y:0,width:10,height:5}})};
 const result=await api.computePosition({}, {}, {platform,middleware:[api.offset(4,[4])]});assert.equal(result.x,5);assert.equal(result.y,14);
});
test('equivalence handles cyclic records, opaque objects and React ownership',async()=>{
 const {equivalent}=await import('../equivalent.mjs');const a={n:1},b={n:1};a.self=a;b.self=b;assert.equal(equivalent(a,b),true);b.n=2;assert.equal(equivalent(a,b),false);
 assert.equal(equivalent(new Date(0),new Date(0)),false);assert.equal(equivalent({$$typeof:Symbol.for('react.element'),_owner:a},{$$typeof:Symbol.for('react.element'),_owner:b}),true);
});
