'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),dom=new JSDOM('<div id="root"></div>',{pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
const React=require('react'),{createRoot}=require('react-dom/client');
(async()=>{
 for(const variant of ['memoize-one-legacy','memoize-one','../../packages/vmemoize-one']){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vpm-memoize-caller-'));
  try{
   const modules=path.join(dir,'node_modules');fs.mkdirSync(modules);
   fs.cpSync(path.dirname(require.resolve('react-window/package.json')),path.join(modules,'react-window'),{recursive:true});
   for(const name of ['react','@babel/runtime']){const dest=path.join(modules,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.symlinkSync(path.dirname(require.resolve(name+'/package.json')),dest);}
   const shim=path.join(modules,'memoize-one');fs.mkdirSync(shim);fs.writeFileSync(path.join(shim,'index.js'),'module.exports=require('+JSON.stringify(require.resolve(variant))+');');
   const {FixedSizeList}=require(path.join(modules,'react-window'));const root=createRoot(document.getElementById('root'));let notifications=0;
   const props={height:100,width:200,itemCount:100,itemSize:20,overscanCount:1,onItemsRendered(){notifications++;},children:({index,style})=>React.createElement('div',{style},'Row '+index)};
   await React.act(()=>root.render(React.createElement(FixedSizeList,props)));
   assert(document.body.textContent.includes('Row 0'));assert(!document.body.textContent.includes('Row 99'));assert.equal(notifications,1);
   await React.act(()=>root.render(React.createElement(FixedSizeList,{...props,className:'changed'})));assert.equal(notifications,1);
   await React.act(()=>root.render(React.createElement(FixedSizeList,{...props,height:140})));assert.equal(notifications,2);assert(document.body.textContent.includes('Row 6'));
   await React.act(()=>root.unmount());console.log(variant+': actual react-window1.8.11/React19 render, equal-range suppression and resize passed');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 }
 dom.window.close();
})().catch(error=>{console.error(error);process.exitCode=1;});
