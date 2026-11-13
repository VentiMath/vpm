'use strict';
const host = require('./host.cjs');
function trace(file, seed=1, mode='immediate', realm='vm') {
  const h=host(file,mode,realm), s=h.api, out=[], handles=[];
  let random=seed;
  const rand=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random;};
  const log=(...values)=>out.push([h.now,h.turns,...values]);
  for(let i=0;i<32;i++) {
    const p=1+rand()%5, delay=rand()%4===0 ? rand()%40 : 0;
    const continuation=rand()%3===0, cost=rand()%8;
    handles.push(s.unstable_scheduleCallback(p,expired=>{
      log(i,p,s.unstable_getCurrentPriorityLevel(),expired);
      h.advance(cost);
      log('yield',i,s.unstable_shouldYield());
      if(continuation) return expired=>log('continuation',i,s.unstable_getCurrentPriorityLevel(),expired);
    },{delay}));
  }
  for(let i=0;i<handles.length;i++) if(rand()%4===0) s.unstable_cancelCallback(handles[i]);
  for(let t=0;t<100;t++) {h.flush();h.advance(1);}
  h.advance(10000);h.flush();
  return out;
}
function targeted(file,mode='immediate',realm='vm') {
  const h=host(file,mode,realm),s=h.api,out=[];
  s.unstable_scheduleCallback(3,()=>{
    out.push(['normal',h.turns,s.unstable_shouldYield()]);
    s.unstable_scheduleCallback(1,expired=>out.push(['immediate',h.turns,expired]));
    out.push(['newPriorityDoesNotYield',s.unstable_shouldYield()]);
    s.unstable_requestPaint(); out.push(['paint',s.unstable_shouldYield()]);
  });
  s.unstable_scheduleCallback(3,()=>out.push(['next',h.turns]));
  h.flush();
  for(const p of [1,2,3,4,5]) s.unstable_runWithPriority(p,()=>{
    out.push(['priority',p,s.unstable_getCurrentPriorityLevel(),s.unstable_next(()=>s.unstable_getCurrentPriorityLevel())]);
    const callback=s.unstable_wrapCallback(function(x){return [this.id,x,s.unstable_getCurrentPriorityLevel()];});
    out.push(['wrapped',s.unstable_runWithPriority(1,()=>callback.call({id:42},7))]);
  });
  try{s.unstable_runWithPriority(2,()=>{throw Error('restore')})}catch{}
  out.push(['restored',s.unstable_getCurrentPriorityLevel()]);
  s.unstable_scheduleCallback(3,()=>{throw Error('callback')});
  s.unstable_scheduleCallback(3,()=>out.push(['survived',s.unstable_getCurrentPriorityLevel()]));
  try{h.tick()}catch(e){out.push(['error',e.message]);}h.flush();
  for(const fps of [60,125,0]) {
    s.unstable_forceFrameRate(fps);
    s.unstable_scheduleCallback(3,()=>{out.push(['sliceStart',fps,s.unstable_shouldYield()]);h.advance(fps ? Math.floor(1000/fps)-1 : 4);out.push(['sliceBefore',fps,s.unstable_shouldYield()]);h.advance(1);out.push(['sliceEnd',fps,s.unstable_shouldYield()]);});h.flush();
  }
  return out;
}
module.exports={trace,targeted};
