'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const variant=process.argv[2]||'vpm',version=process.argv[3]||'19.1',mode=process.argv[4]||'server';
(async()=>{
 let dom;if(mode==='client'){
  dom=new(require('jsdom').JSDOM)('<div id="root"></div>',{pretendToBeVisual:true,url:'http://localhost'});
  for(const k of ['window','document','navigator','HTMLElement','Element','Node','getComputedStyle'])Object.defineProperty(globalThis,k,{value:typeof dom.window[k]==='function'&&k==='getComputedStyle'?dom.window[k].bind(dom.window):dom.window[k],configurable:true});
  globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 }
 const {api:D,React,selected}=require('./load.cjs')(variant,version),h=React.createElement;
 const results=[],rubrics=[];let current;
 function Board({disabled=false}={}){return h(D.DragDropContext,{onDragEnd:r=>results.push(r)},h(D.Droppable,{droppableId:'cards',type:'card'},p=>h('div',{ref:p.innerRef,...p.droppableProps},['a','b'].map((id,index)=>h(D.Draggable,{key:id,draggableId:id,index,isDragDisabled:disabled},(p,s,r)=>{rubrics.push(r);return h('div',{...p.draggableProps,...p.dragHandleProps,ref:p.innerRef,'data-test':id},id,h('button',null,'Open'));})),p.placeholder)));}
 const html=selected('react-dom/server').renderToString(h(Board));assert(html.includes('data-rfd-draggable-id="a"'));assert(rubrics.every(r=>r.type==='card'));assert(html.includes('aria-describedby'));assert(!html.includes('position:fixed'));
 if(mode==='client'){
  const host=document.getElementById('root'),errors=[];host.innerHTML=html;const before=host.querySelector('[data-test=a]');
  await React.act(async()=>{current=selected('react-dom/client').hydrateRoot(host,h(Board),{onRecoverableError:e=>errors.push(String(e))});});assert.equal(host.querySelector('[data-test=a]'),before);assert.deepEqual(errors,[]);
  const described=before.getAttribute('aria-describedby');assert(document.getElementById(described));assert(before.tabIndex===0);
  await React.act(()=>current.render(h(Board,{disabled:true})));assert.equal(before.hasAttribute('data-rfd-drag-handle-context-id'),false);
  await React.act(()=>current.render(h(Board)));assert.equal(before.tabIndex,0);
  await React.act(()=>current.unmount());assert.equal(host.children.length,0);dom.window.close();
 }
 console.log(variant,version,mode,'SSR rubric, handles, hydration identity, live disabled state and teardown pass');
})().catch(e=>{console.error(e);process.exitCode=1;});
