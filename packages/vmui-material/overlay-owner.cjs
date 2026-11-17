'use strict';
// Overlays share ownership per document, including iframe documents. Closing one
// must not unlock scrolling or expose a sibling behind another open overlay.
const documents=new WeakMap();
function enter(doc,root,lock){
 let state=documents.get(doc);if(!state){state={entries:[],hidden:new Map(),scroll:null};documents.set(doc,state);}
 const entry={root,lock};state.entries.push(entry);
 function sync(){
  for(const [node,value]of state.hidden){if(value===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',value);}state.hidden.clear();
  const top=state.entries.at(-1)?.root;
  if(top)for(const node of doc.body.children)if(!node.contains(top)&&!['SCRIPT','STYLE','LINK'].includes(node.tagName)&&!node.hasAttribute('aria-live')){state.hidden.set(node,node.getAttribute('aria-hidden'));node.setAttribute('aria-hidden','true');}
  const needs=state.entries.some(e=>e.lock);
  if(needs&&!state.scroll){const body=doc.body,view=doc.defaultView,width=Math.max(0,view.innerWidth-doc.documentElement.clientWidth);state.scroll={overflow:body.style.overflow,paddingRight:body.style.paddingRight};body.style.overflow='hidden';if(width)body.style.paddingRight=(parseFloat(view.getComputedStyle(body).paddingRight)||0)+width+'px';}
  if(!needs&&state.scroll){Object.assign(doc.body.style,state.scroll);state.scroll=null;}
 }
 sync();return {top:()=>state.entries.at(-1)===entry,release(){const i=state.entries.indexOf(entry);if(i>=0)state.entries.splice(i,1);sync();if(!state.entries.length)documents.delete(doc);}};
}
module.exports={enter};
