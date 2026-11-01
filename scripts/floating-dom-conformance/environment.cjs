'use strict';
// Controlled geometry and queued-observer model, not a browser-performance model.
exports.environment = function environment() {
  const saved = new Map(), replace = (key,value) => { saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key)); Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}); };
  class Target {
    events = new Map();
    addEventListener(type,fn) { if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(fn); }
    removeEventListener(type,fn) { this.events.get(type)?.delete(fn); }
    dispatch(type) { for(const fn of [...(this.events.get(type)||[])])fn({type}); }
    count() { return [...this.events.values()].reduce((n,list)=>n+list.size,0); }
  }
  const win = new Target(), frames=new Map(), timers=new Map(), observers=[];let sequence=0;
  class Node extends Target { constructor(name){ super();this.nodeName=name; } }
  class Element extends Node { matches(){ return false; } }
  class HTMLElement extends Element {
    constructor(name='DIV') { super(name);Object.assign(this,{clientLeft:0,clientTop:0,clientWidth:100,clientHeight:50,offsetWidth:100,offsetHeight:50,scrollLeft:0,scrollTop:0,scrollWidth:100,scrollHeight:50,style:{width:'100px',height:'50px',position:'static',overflow:'visible',display:'block',direction:'ltr',paddingLeft:'0px',paddingTop:'0px',marginLeft:'0px',marginRight:'0px'},rect:{x:10,y:20,width:100,height:50}}); }
    getBoundingClientRect(){const r=this.rect;return {...r,left:r.x,top:r.y,right:r.x+r.width,bottom:r.y+r.height};}
    getClientRects(){return [this.getBoundingClientRect()];}
  }
  class Observer { constructor(callback){this.callback=callback;this.targets=new Set();observers.push(this);} observe(e){this.targets.add(e);} unobserve(e){this.targets.delete(e);} disconnect(){this.targets.clear();} }
  const document={defaultView:win,compatMode:'CSS1Compat'};
  const html=new HTMLElement('HTML'),body=new HTMLElement('BODY'),container=new HTMLElement(),reference=new HTMLElement(),floating=new HTMLElement();
  document.documentElement=html;document.body=body;
  Object.assign(win,{window:win,parent:win,document,Node,Element,HTMLElement,ShadowRoot:class extends Node {},ResizeObserver:Observer,IntersectionObserver:Observer,scrollX:0,scrollY:0,
    getComputedStyle:el=>el.style,requestAnimationFrame:fn=>{frames.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:fn=>{timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id)});
  for(const node of [html,body,container,reference,floating])node.ownerDocument=document;
  body.parentNode=html;container.parentNode=body;reference.parentNode=floating.parentNode=container;html.parentNode=html;
  container.style.overflow='auto';container.style.position='relative';reference.style.position=floating.style.position='absolute';reference.offsetParent=floating.offsetParent=container;
  container.rect={x:0,y:0,width:300,height:200};container.style.width='300px';container.style.height='200px';container.clientWidth=container.offsetWidth=300;container.clientHeight=container.offsetHeight=200;
  html.rect={x:0,y:0,width:800,height:600};body.rect={...html.rect};html.clientWidth=body.clientWidth=800;html.clientHeight=body.clientHeight=600;
  for(const name of ['window','document','Node','Element','HTMLElement','ShadowRoot','ResizeObserver','IntersectionObserver','requestAnimationFrame','cancelAnimationFrame','getComputedStyle'])replace(name,name==='window'?win:name==='document'?document:win[name]);
  const restore=()=>{for(const [key,value]of saved){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}};
  return {win,document,html,body,container,reference,floating,observers,frames,timers,restore,flushFrames(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());}};
};
