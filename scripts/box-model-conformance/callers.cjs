'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),esbuild=require('esbuild');
const styles={display:'block'};for(const kind of ['margin','padding','border'])for(const side of ['Top','Right','Bottom','Left'])styles[kind+side+(kind==='border'?'Width':'')]=kind==='margin'?'3px':'2px';
const results=[];
for(const original of [true,false]){
 const library=require.resolve(original?'css-box-model':'../../packages/vcss-box-model'),window={pageXOffset:7,pageYOffset:11,getComputedStyle:()=>styles};
 const el={tagName:'DIV',getBoundingClientRect:()=>({top:20,left:30,bottom:100,right:230}),ownerDocument:{defaultView:window},scrollTop:15,scrollLeft:5,scrollHeight:500,scrollWidth:400};
 const values=[];
 for(const kind of ['draggable','droppable']){
  const file=path.resolve(__dirname,`node_modules/@hello-pangea/dnd/src/view/use-${kind}-publisher/get-dimension.ts`);
  const result=esbuild.buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'browser',alias:{'css-box-model':library},define:{'process.env.NODE_ENV':'"test"'},metafile:true});
  assert(Object.keys(result.metafile.inputs).some(x=>path.resolve(x)===library));
  const sandbox={module:{exports:{}},window,process:{env:{NODE_ENV:'test'}}};vm.runInNewContext(result.outputFiles[0].text,sandbox);const get=sandbox.module.exports.default;
  if(kind==='draggable')values.push(get({id:'item',index:2,droppableId:'list',type:'DEFAULT'},el,{x:7,y:11}));
  else for(const closestScrollable of [null,el])values.push(get({ref:el,descriptor:{id:'list',type:'DEFAULT',mode:'standard'},env:{closestScrollable,isFixedOnPage:false},windowScroll:{x:7,y:11},direction:'vertical',isDropDisabled:false,isCombineEnabled:false,shouldClipSubject:true}));
 }
 results.push(JSON.stringify(values));
}
assert.equal(results[0],results[1]);
// Original bug controls use fresh module instances so the shared-default mutation
// cannot contaminate other comparisons.
for(const original of [true,false]){
 const module={exports:{}},window={getComputedStyle(){throw Error('wrong document')}};
 vm.runInNewContext(fs.readFileSync(require.resolve(original?'css-box-model':'../../packages/vcss-box-model'),'utf8'),{module,exports:module.exports,require:require('node:module').createRequire(require.resolve(original?'css-box-model':'../../packages/vcss-box-model')),window});const b=module.exports;
 const edges={top:0,right:10,bottom:10,left:0};b.createBox({borderBox:edges}).margin.top=99;
 assert.equal(b.createBox({borderBox:edges}).marginBox.top,original?-99:0);
 const element={getBoundingClientRect:()=>edges,ownerDocument:{defaultView:{getComputedStyle:()=>styles}}};
 if(original)assert.throws(()=>b.getBox(element),/wrong document/);else assert.equal(b.getBox(element).borderBox.width,10);
}
console.log('Actual DND18 draggable, plain droppable and scrollable droppable outputs match; default contamination and owning-window controls pass.');
