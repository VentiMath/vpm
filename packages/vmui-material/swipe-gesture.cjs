'use strict';
const {ownsGesture}=require('./overlay-owner.cjs');
const owners=new WeakMap();
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function targetOpen(startOpen,progress,velocity,hysteresis=.52,minFlingVelocity=450){
 if(Math.abs(velocity)>minFlingVelocity)return velocity>0;
 return startOpen?progress>=1-hysteresis:progress>hysteresis;
}
function scrollConsumes(target,paper,horizontal,delta){
 const view=paper.ownerDocument.defaultView;
 for(let el=target?.nodeType===1?target:target?.parentElement;el&&paper.contains(el);el=el.parentElement){
  if(el.matches('input[type="range"],video,audio'))return true;
  const style=view.getComputedStyle(el),overflow=horizontal?style.overflowX:style.overflowY;
  if(!/auto|scroll|overlay/.test(overflow))continue;
  const position=horizontal?el.scrollLeft:el.scrollTop,max=horizontal?el.scrollWidth-el.clientWidth:el.scrollHeight-el.clientHeight;
  // RTL scrollers can use negative positions. Normalize their available range.
  const pos=horizontal&&style.direction==='rtl'?-position:position,travel=horizontal&&style.direction==='rtl'?-delta:delta;
  if(max>1&&(travel<0&&pos<max-1||travel>0&&pos>1))return true;
 }
 return false;
}
function installSwipe({doc,read,root,paper,area}){
 let gesture=null,settleTimer=null,restore=null,preview=null;
 const view=doc.defaultView;
 const point=(event,id)=>Array.from(event.touches||[]).find(t=>id==null||t.identifier===id);
 function release(){if(owners.get(doc)===root)owners.delete(doc);}
 function unlisten(){doc.removeEventListener('touchmove',move);doc.removeEventListener('touchend',end);doc.removeEventListener('touchcancel',end);}
 function cleanup(){unlisten();if(settleTimer!==null)view.clearTimeout(settleTimer);settleTimer=null;restore?.();restore=null;preview=null;gesture=null;release();}
 function start(event){
  const p=read(),node=paper.current,host=root.current,touch=point(event);
  if(event.touches.length!==1){cleanup();return;}
  if(!node||!host||event.defaultPrevented||event.touches.length!==1||!ownsGesture(doc,host)||!touch)return;
  const inside=node.contains(event.target),horizontal=p.anchor==='left'||p.anchor==='right',sign=p.anchor==='left'||p.anchor==='top'?1:-1;
  if(p.open){if(!inside)return;}
  else{
   if(p.disableSwipeToOpen)return;
   const coordinate=horizontal?touch.clientX:touch.clientY,limit=horizontal?view.innerWidth:view.innerHeight;
   if(sign>0?coordinate>p.swipeAreaWidth:coordinate<limit-p.swipeAreaWidth)return;
   if(inside&&!(typeof p.allowSwipeInChildren==='function'?p.allowSwipeInChildren(event,area.current,node):p.allowSwipeInChildren))return;
   if(!inside&&area.current&&!area.current.contains(event.target))return;
  }
  if(event.target?.closest?.('input[type="range"],video,audio'))return;
  cleanup();
  const size=horizontal?node.getBoundingClientRect().width:node.getBoundingClientRect().height;if(!size)return;
  const saved={transform:node.style.transform,webkitTransform:node.style.webkitTransform,transition:node.style.transition,webkitTransition:node.style.webkitTransition,visibility:node.style.visibility};
  const backdrop=host.querySelector('.MuiBackdrop-root'),backStyle=backdrop?{opacity:backdrop.style.opacity,transition:backdrop.style.transition,visibility:backdrop.style.visibility}:null;
  const visibility=host.style.visibility,pointerEvents=host.style.pointerEvents,hidden=host.getAttribute('aria-hidden');
  restore=()=>{
   if(node.isConnected){const {transform,webkitTransform,...rest}=saved;Object.assign(node.style,rest);const now=read().open;if(now||read().anchor===p.anchor)node.style.transform=node.style.webkitTransform=now?'none':`translate${horizontal?'X':'Y'}(${sign*-size}px)`;node.style.visibility=now?'':'hidden';}
   if(backdrop?.isConnected){Object.assign(backdrop.style,backStyle);backdrop.style.opacity=read().open?'1':'0';backdrop.style.visibility=read().open?'':'hidden';}
   host.style.visibility=visibility;host.style.pointerEvents=pointerEvents;
   if(ownsGesture(doc,host)){if(hidden===null)host.removeAttribute('aria-hidden');else host.setAttribute('aria-hidden',hidden);}
  };
  if(!p.open)preview={host,hidden,pointerEvents};
  gesture={id:touch.identifier,node,host,backdrop,horizontal,sign,size,open:p.open,x:touch.clientX,y:touch.clientY,last:horizontal?touch.clientX:touch.clientY,time:event.timeStamp,velocity:0,progress:p.open?1:0,active:false,target:event.target};
  doc.addEventListener('touchmove',move,{passive:false});doc.addEventListener('touchend',end);doc.addEventListener('touchcancel',end);
  if(!p.open&&!p.disableDiscovery)paint(gesture,Math.min(p.swipeAreaWidth,size)/size);
 }
 function paint(g,progress){
  const p=read();g.progress=clamp(progress,0,1);
  g.node.style.transition=g.node.style.webkitTransition='none';g.node.style.visibility='';
  g.node.style.transform=g.node.style.webkitTransform=`translate${g.horizontal?'X':'Y'}(${g.sign*(g.progress-1)*g.size}px)`;
  if(!g.open){g.host.style.visibility='visible';g.host.style.pointerEvents='none';g.host.setAttribute('aria-hidden','true');}
  if(g.backdrop&&!p.disableBackdropTransition){g.backdrop.style.transition='none';g.backdrop.style.visibility='';g.backdrop.style.opacity=String(g.progress);}
 }
 function move(event){
  const g=gesture;if(!g)return;
  if(event.defaultPrevented||event.touches.length!==1||read().open!==g.open){cleanup();return;}
  const touch=point(event,g.id);if(!touch){cleanup();return;}
  const delta=g.horizontal?touch.clientX-g.x:touch.clientY-g.y,cross=g.horizontal?touch.clientY-g.y:touch.clientX-g.x;
  if(!g.active){
   if(Math.max(Math.abs(delta),Math.abs(cross))<3)return;
   if(Math.abs(cross)>Math.abs(delta)||g.open&&scrollConsumes(g.target,g.node,g.horizontal,delta)){cleanup();return;}
   if(owners.has(doc)&&owners.get(doc)!==root){cleanup();return;}
   owners.set(doc,root);g.active=true;
  }
  if(event.cancelable)event.preventDefault();
  const position=g.horizontal?touch.clientX:touch.clientY,elapsed=event.timeStamp-g.time;
  if(elapsed>0)g.velocity=g.sign*(position-g.last)*1000/elapsed;
  g.last=position;g.time=event.timeStamp;
  paint(g,(g.open?1:0)+g.sign*delta/g.size);
 }
 function end(event){
  const g=gesture;if(!g)return;
  if(event.type==='touchcancel'||event.touches.length||!g.active){cleanup();return;}
  const p=read();gesture=null;unlisten();release();
  const velocity=event.timeStamp-g.time>100?0:g.velocity;
  const next=targetOpen(g.open,g.progress,velocity,p.hysteresis,p.minFlingVelocity),duration=typeof p.transitionDuration==='number'?p.transitionDuration:p.transitionDuration?.[next?'enter':'exit']??225;
  const reduced=p.reducedMotion==='always'||p.reducedMotion==='system'&&view.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ms=reduced?0:duration;
  void g.node.offsetHeight;g.node.style.transition=g.node.style.webkitTransition=`transform ${ms}ms ease-out`;
  g.node.style.transform=g.node.style.webkitTransform=next?'none':`translate${g.horizontal?'X':'Y'}(${g.sign*-g.size}px)`;
  if(g.backdrop&&!p.disableBackdropTransition){g.backdrop.style.transition=`opacity ${ms}ms ease-out`;g.backdrop.style.opacity=next?'1':'0';}
  // The parent owns open. Restore to its actual state if it declines a request.
  settleTimer=view.setTimeout(cleanup,ms+32);
  try{if(next!==g.open)(next?p.onOpen:p.onClose)?.(event);}catch(error){cleanup();throw error;}
 }
 doc.addEventListener('touchstart',start,{passive:true});
 return {cancel:cleanup,sync(){if(read().open&&preview){preview.host.style.pointerEvents=preview.pointerEvents;if(preview.hidden===null)preview.host.removeAttribute('aria-hidden');else preview.host.setAttribute('aria-hidden',preview.hidden);preview=null;}},dispose(){cleanup();doc.removeEventListener('touchstart',start);doc.removeEventListener('touchmove',move);doc.removeEventListener('touchend',end);doc.removeEventListener('touchcancel',end);}};
}
module.exports={installSwipe,targetOpen,scrollConsumes};
