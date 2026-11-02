'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),box=require('..');
const edges={top:10,left:20,bottom:60,right:120};
const styles=Object.fromEntries(['margin','padding','border'].flatMap(kind=>['Top','Right','Bottom','Left'].map(side=>[kind+side+(kind==='border'?'Width':''),'2.5px'])));
test('defaults are separate mutable records; explicit spacing keeps caller identity',()=>{
 const first=box.createBox({borderBox:edges});first.margin.top=50;assert.equal(first.border.top,0);assert.equal(first.padding.top,0);assert.equal(box.createBox({borderBox:edges}).marginBox.top,10);
 const spacing={top:1,right:2,bottom:3,left:4},value=box.createBox({borderBox:edges,margin:spacing});assert.equal(value.margin,spacing);assert.deepEqual(edges,{top:10,left:20,bottom:60,right:120});
});
test('negative and fractional geometry and zero offsets keep values without mutation',()=>{
 const value=box.calculateBox({top:-12.5,left:0.25,bottom:3.5,right:10.5},styles);assert.equal(value.contentBox.width,0.25);assert.equal(value.contentBox.height,6);assert.deepEqual(box.offset(value,{x:0,y:0}),value);assert.notEqual(box.offset(value,{x:0,y:0}),value);
});
test('pixel parsing keeps numeric coercion and rejects malformed pixel values',()=>{
 for(const [raw,want]of [['-0px',-0],['.5px',.5],['1e2px',100],['px',0],['2rem',0],['',0]])assert.equal(box.calculateBox(edges,{...styles,paddingTop:raw}).padding.top,want);
 assert.throws(()=>box.calculateBox(edges,{...styles,paddingTop:'1.2.3px'}),/Could not parse value/);
});
test('getBox uses the owning window and reads geometry and styles exactly once',()=>{
 let rects=0,reads=0;const el={getBoundingClientRect(){rects++;return edges},ownerDocument:{defaultView:{getComputedStyle(target){assert.equal(target,el);reads++;return styles}}}};
 const prior=global.window;global.window={getComputedStyle(){throw Error('wrong document')}};
 try{assert.deepEqual(box.getBox(el),box.calculateBox(edges,styles));assert.equal(rects,1);assert.equal(reads,1)}finally{if(prior===undefined)delete global.window;else global.window=prior}
});
test('ESM named exports share the CJS functions',async()=>{const esm=await import('../index.mjs');for(const name of Object.keys(box))assert.equal(esm[name],box[name])});
