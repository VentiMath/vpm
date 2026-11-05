import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {renderToString} from 'react-dom/server';
import * as D from '@hello-pangea/dnd';
const h=React.createElement;let root,change,options={};
const initial=()=>[{id:'A',cards:['a','b','c']},{id:'B',cards:['d','e']},{id:'C',cards:[]}];
function Board(){
 const [lists,setLists]=React.useState(()=>options.long?[{id:'A',cards:Array.from({length:18},(_,i)=>'a'+i)},{id:'B',cards:['d','e']},{id:'C',cards:[]}]:initial());
 const [disabled,setDisabled]=React.useState(false);change={setLists,setDisabled};window.order=lists;
 return h(D.DragDropContext,{onBeforeCapture:v=>window.events.push(['capture',v]),onBeforeDragStart:v=>window.events.push(['before',v]),onDragStart:v=>window.events.push(['start',v]),onDragUpdate:v=>window.events.push(['update',v]),onDragEnd:result=>{
  window.events.push(['end',result]);window.results.push(result);
  if(result.reason!=='DROP'||!result.destination)return;
  const {source,destination}=result;setLists(old=>{const next=old.map(l=>({...l,cards:[...l.cards]}));
   if(result.type==='list'){const [v]=next.splice(source.index,1);next.splice(destination.index,0,v);}
   else{const from=next.find(l=>l.id===source.droppableId),to=next.find(l=>l.id===destination.droppableId);const [v]=from.cards.splice(source.index,1);to.cards.splice(destination.index,0,v);}
   return next;
  });
 }},h(D.Droppable,{droppableId:'columns',direction:'horizontal',type:'list'},provided=>h('div',{ref:provided.innerRef,...(options.omit?{}:provided.droppableProps),className:'columns'},lists.map((list,index)=>h(D.Draggable,{key:list.id,draggableId:list.id,index},(p,s)=>h('section',{ref:p.innerRef,...p.draggableProps,...p.dragHandleProps,'data-test':'col-'+list.id,className:'column'},
 h('header',{...p.dragHandleProps,'data-test':'header-'+list.id},list.id,h('button',{onClick:()=>window.clicks++},'Edit column')),
 h('div',{className:'scroll','data-test':'scroll-'+list.id},h(D.Droppable,{droppableId:list.id,type:'card',direction:'vertical',isDropDisabled:list.id==='B'&&disabled},q=>h('div',{ref:q.innerRef,...(options.omit?{}:q.droppableProps),className:'cards','data-test':'list-'+list.id},list.cards.map((card,i)=>h(D.Draggable,{draggableId:card,index:i,key:card,isDragDisabled:options.disabled&&card==='a'},(r,s)=>h('div',{ref:r.innerRef,...r.draggableProps,...r.dragHandleProps,className:'card','data-test':card,'data-dragging':String(s.isDragging)},h('span',null,card),h('button',{'data-test':'button-'+card,onClick:()=>window.clicks++},'Open '+card)))),q.placeholder))),
 h('button',null,'Add card')))),provided.placeholder,h('button',null,'Add list'))));
}
const style=document.createElement('style');style.textContent='body{margin:20px;font:16px sans-serif}.columns{display:flex;align-items:flex-start;gap:12px;width:740px}.column{width:220px;flex-shrink:0;background:#eee;border:1px solid #bbb;box-sizing:border-box}header{height:42px;padding:6px;box-sizing:border-box;display:flex;justify-content:space-between}.scroll{height:180px;overflow:auto}.cards{display:flex;flex-direction:column;gap:8px;min-height:160px;padding:10px;box-sizing:border-box}.card{padding:4px 8px;background:white;border:1px solid black;box-sizing:border-box;min-height:48px;display:flex;flex-direction:column;flex-shrink:0}.card:nth-child(3n){min-height:62px}.card button{height:20px}';document.head.append(style);
window.events=[];window.results=[];window.clicks=0;
window.mount=async opts=>{if(root)flushSync(()=>root.unmount());document.getElementById('root').replaceChildren();options=opts||{};window.events=[];window.results=[];window.clicks=0;root=createRoot(document.getElementById('root'));flushSync(()=>root.render(options.strict?h(React.StrictMode,null,h(Board)):h(Board)));await new Promise(r=>setTimeout(r,30));};
window.teardown=()=>{if(root)flushSync(()=>root.unmount());root=null;};
window.disableB=()=>flushSync(()=>change.setDisabled(true));
window.geometry=test=>{const n=document.querySelector('[data-test="'+test+'"]'),r=n.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+8,left:r.left,top:r.top,width:r.width,height:r.height,bottom:r.bottom};};
window.hydration=async()=>{window.teardown();options={};const host=document.getElementById('root');host.innerHTML=renderToString(h(Board));const before=host.querySelector('[data-test="a"]'),errors=[];root=hydrateRoot(host,h(Board),{onRecoverableError:e=>errors.push(String(e))});await new Promise(r=>setTimeout(r,50));return {same:before===host.querySelector('[data-test="a"]'),errors};};
