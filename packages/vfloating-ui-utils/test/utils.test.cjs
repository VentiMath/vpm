'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),path=require('node:path');
const ours=require('..'),upstream=require('../../../scripts/floating-utils-conformance/node_modules/@floating-ui/utils');
test('complete helper contract across placements, RTL, geometry, padding and numeric boundaries',()=>{
 assert.deepEqual(Object.keys(ours).sort(),Object.keys(upstream).sort());
 for(const key of ['sides','alignments','placements'])assert.deepEqual(ours[key],upstream[key]);
 for(const p of upstream.placements){
  for(const key of ['getSide','getAlignment','getSideAxis','getAlignmentAxis','getOppositePlacement','getOppositeAlignmentPlacement','getExpandedPlacements'])assert.deepEqual(ours[key](p),upstream[key](p),key+p);
  for(const rtl of [false,true])for(const flip of [false,true])for(const direction of ['none','start','end'])assert.deepEqual(ours.getOppositeAxisPlacements(p,flip,direction,rtl),upstream.getOppositeAxisPlacements(p,flip,direction,rtl));
  for(const width of [0,20,100])for(const height of [0,20,100])for(const rtl of [false,true]){
   const rects={reference:{x:0,y:0,width,height},floating:{x:0,y:0,width:20,height:20}};
   assert.deepEqual(ours.getAlignmentSides(p,rects,rtl),upstream.getAlignmentSides(p,rects,rtl));
  }
 }
 for(const axis of ['x','y'])for(const name of ['getOppositeAxis','getAxisLength'])assert.equal(ours[name](axis),upstream[name](axis));
 for(const p of [0,-1,Infinity,NaN,{}, {top:null,right:undefined,bottom:-2,extra:5},Object.create({left:7})])assert.deepEqual(ours.getPaddingObject(p),upstream.getPaddingObject(p));
 for(const x of [-Infinity,-1,-0,0,1.4,Infinity,NaN]){
  for(const name of ['createCoords','floor','round','min','max'])assert.deepEqual(ours[name](x),upstream[name](x));
  assert.equal(ours.clamp(-1,x,1),upstream.clamp(-1,x,1));
  assert.deepEqual(ours.rectToClientRect({x,y:-x,width:10,height:20}),upstream.rectToClientRect({x,y:-x,width:10,height:20}));
 }
 assert.equal(ours.evaluate(x=>x+1,2),3);assert.equal(ours.evaluate(3,2),3);
});
test('fallback arrays are owned by each call; upstream control demonstrates corruption',()=>{
 const prior=upstream.getOppositeAxisPlacements('top',true,'start').slice();
 try {upstream.getOppositeAxisPlacements('top',true,'start')[0]='corrupted';assert.equal(upstream.getOppositeAxisPlacements('bottom',true,'start')[0],'corrupted');}
 finally {upstream.getOppositeAxisPlacements('top',true,'start').splice(0,2,...prior);}
 ours.getOppositeAxisPlacements('top',true,'start')[0]='corrupted';assert.deepEqual(ours.getOppositeAxisPlacements('bottom',true,'start'),['left','right']);
});
test('CJS and ESM function identities and server-side predicates',async()=>{
 const esm=await import('../runtime.mjs');for(const key of Object.keys(ours))assert.equal(ours[key],esm[key]);
 const dom=require('../dom.cjs');for(const key of ['isNode','isElement','isHTMLElement','isShadowRoot'])assert.equal(dom[key]({}),false);
});
test('DOM contracts, foreign realms, shadow slots and stack-safe ancestry',()=>{
 const {JSDOM}=require('../../../scripts/floating-utils-conformance/node_modules/jsdom'),env=new JSDOM('<!doctype html><body><section><div></div></section></body>');
 const prior=new Map();for(const name of ['window','document','Node','Element','HTMLElement','ShadowRoot']){prior.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value:name==='window'?env.window:env.window[name],configurable:true,writable:true});}
 try {
  const dom=require('../dom.cjs'),ref=require('../../../scripts/floating-utils-conformance/node_modules/@floating-ui/utils/dom');
  assert.deepEqual(Object.keys(dom).sort(),Object.keys(ref).sort());
  const leaf=document.querySelector('div'),parent=leaf.parentNode;parent.style.overflow='auto';parent.style.transform='translateX(1px)';
  for(const fn of ['getParentNode','getNearestOverflowAncestor','getContainingBlock','getDocumentElement','getWindow','getNodeName','getNodeScroll','getOverflowAncestors','isContainingBlock','isOverflowElement','isTopLayer','isTableElement','isLastTraversableNode'])assert.deepEqual(dom[fn](leaf),ref[fn](leaf),fn);
  const host=document.createElement('div');document.body.append(host);const shadow=host.attachShadow({mode:'open'});const slot=document.createElement('slot');shadow.append(slot);const child=document.createElement('span');host.append(child);assert.equal(dom.getParentNode(child),slot);assert.equal(dom.getParentNode(slot),host);
  const iframe=document.createElement('iframe');document.body.append(iframe);const foreign=iframe.contentDocument.createElement('div');iframe.contentDocument.body.append(foreign);
  for(const fn of ['isNode','isElement','isHTMLElement'])assert.equal(dom[fn](foreign),true);
  assert.deepEqual(dom.getOverflowAncestors(foreign),ref.getOverflowAncestors(foreign));
  const initial=[leaf];assert.deepEqual(dom.getOverflowAncestors(leaf,initial),ref.getOverflowAncestors(leaf,initial));assert.deepEqual(initial,[leaf]);
  // Use genuine Node prototypes without making JSDOM itself recursively build a 20k-deep tree.
  let node=document.body;
  for(let i=0;i<20000;i++)node=Object.create(Node.prototype,{parentNode:{value:node},ownerDocument:{value:document},nodeName:{value:'TEXT'}});
  if(process.versions.bun)assert.equal(ref.getNearestOverflowAncestor(node),document.body);else assert.throws(()=>ref.getNearestOverflowAncestor(node),RangeError);assert.equal(dom.getNearestOverflowAncestor(node),document.body);
  delete globalThis.Element;assert.equal(dom.isElement(leaf),true);
 }finally{env.window.close();for(const [name,d]of prior)d?Object.defineProperty(globalThis,name,d):delete globalThis[name];}
});
test('retained upstream tests',()=>{const r=spawnSync(process.execPath,[path.resolve(__dirname,'../../../scripts/floating-utils-conformance/run.cjs')],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);});
