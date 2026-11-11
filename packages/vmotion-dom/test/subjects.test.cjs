"use strict";
const { test } = require('node:test'), assert = require('node:assert/strict');
const api = require(process.env.VMOTION_DOM_ENTRY || '../index.cjs');
function clock() { let now=1000,tick;api.time.set(now);return { driver:fn=>(tick=fn,{now:()=>now,start(){},stop(){}}),tick(t){now=t;api.time.set(t);tick(t);} }; }
const paused={duration:1,ease:'linear',autoplay:false};
test('string mixer color classification retains strict color grammar',()=>{
 for(const s of ['#abc','  RGBA(1,2,3,.5)\n','hsl(1turn 20% 30%)','\tTRANSPARENT\n']) assert.equal(api.color.test(s),true,s);
 for(const s of ['20px','10px 20px #fff','transparent-x','rgb(1,2,3 / 1)','#abcdx','hsl(1 2 3)','rgb(1e999,2,3)']) assert.equal(api.color.test(s),false,s);
 assert.equal(api.color.test({red:1,green:2,blue:3}),true);
 assert.equal(api.color.test({red:1,green:2,blue:Infinity}),false);
});
test('color and unit strings deliver typed updates and literal endpoints', async()=>{
 for(const [from,to,mid] of [['#000','#fff','rgba(180, 180, 180, 1)'],['10px','30px','20px']]) {
  const c=clock(),v=api.motionValue(from),updates=[],events=[];
  v.on('animationStart',()=>events.push('start'));v.on('animationComplete',()=>events.push('complete'));
  const a=api.animateSingleValue(v,to,{duration:1,ease:'linear',driver:c.driver,onUpdate:x=>updates.push(x),onComplete:()=>events.push('callback')});
  c.tick(1500);assert.equal(v.get(),mid);c.tick(2000);await a.finished;
  assert.deepEqual(updates,[mid,to]);assert.deepEqual(events,['start','complete','callback']);assert.equal(v.get(),to);
 }
});
test('string keyframes, offsets and easing are owned and from only fills a wildcard',()=>{
 const frames=[null,'10px','30px'],times=[0,.25,1],ease=['linear','linear'],v=api.motionValue('0px');
 const a=api.animateSingleValue(v,frames,{...paused,from:'2px',times,ease});
 frames[1]='100px';times[1]=.8;ease[0]='easeIn';
 a.time=.25;assert.equal(v.get(),'10px');a.cancel();assert.equal(v.get(),'2px');a.stop();
 const b=api.animateSingleValue('0px',['5px','15px'],{...paused,from:'100px'});assert.equal(b.sample(500).value,'10px');b.stop();
});
test('string controls sample without writing, cancel, replay and reverse completion',async()=>{
 const v=api.motionValue('#000'),a=api.animateSingleValue(v,'#fff',{...paused,repeat:1,repeatType:'reverse'});
 assert.equal(a.sampleAt(1500),'rgba(0, 0, 0, 1)');assert.equal(v.get(),'#000');
 a.time=.5;assert.equal(v.get(),'rgba(180, 180, 180, 1)');
 const first=a.finished;a.cancel();await first;assert.equal(v.get(),'#000');
 a.play();a.pause();const replay=a.finished;assert.notEqual(replay,first);a.complete();await replay;assert.equal(v.get(),'#000');
});
test('spring string values overshoot and retain the explicit unit',()=>{
 const c=clock(),v=api.motionValue('0px'),a=api.animateSingleValue(v,'20px',{type:'spring',stiffness:100,damping:10,driver:c.driver});
 c.tick(1500);assert.equal(v.get(),'21.49181px');assert.equal(a.duration,1.05);a.stop();
});
test('invalid string replacements preserve running animation and unit conversion rejects',()=>{
 const c=clock(),v=api.motionValue('0px'),a=api.animateSingleValue(v,'20px',{duration:1,driver:c.driver});
 for(const [target,options] of [['20%',{}],['30px',{duration:-1}],['rgb(bad)',{}],[['0px',Infinity],{}]]) assert.throws(()=>api.animateSingleValue(v,target,options));
 assert.equal(v.animation,a);c.tick(1500);assert.notEqual(v.get(),'0px');a.stop();
});
test('string callback failures release playback and preserve falsy errors',async()=>{
 const c=clock(),v=api.motionValue('0px'),a=api.animateSingleValue(v,'20px',{driver:c.driver,onUpdate(){throw 0;}});
 const settled=a.finished;assert.throws(()=>c.tick(1050),e=>e===0);await settled;assert.equal(a.state,'idle');
 const b=api.motionValue('#000');b.on('animationStart',()=>{throw Error('start');});
 await assert.rejects(api.animateSingleValue(b,'#fff').finished,/start/);assert.equal(b.isAnimating(),false);
});
test('reentrant value observers do not replace the outer onUpdate argument',()=>{
 const v=api.motionValue('0px'),updates=[];let a,entered=false;
 v.on('change',()=>{if(!entered){entered=true;a.time=.25;}});
 a=api.animateSingleValue(v,'20px',{...paused,onUpdate:x=>updates.push(x)});
 a.time=.5;assert.deepEqual(updates,['5px','10px']);assert.equal(v.get(),'5px');a.stop();
});
test('unitless numeric strings interpolate and nonanimatable text settles discretely',()=>{
 const v=api.motionValue('0'),a=api.animateSingleValue(v,'10',paused);a.time=.5;assert.equal(v.get(),'5');a.complete();assert.equal(v.get(),'10');a.stop();
 const text=api.motionValue('closed'),b=api.animateSingleValue(text,'open',paused);assert.equal(b.duration,0);b.complete();assert.equal(text.get(),'open');b.stop();
});
test('root animate distinguishes string values from selectors',()=>{
 const prior=global.document;let queries=0;
 global.document={querySelectorAll(){queries++;return [];}};
 try {
  const v=[];const a=api.animate('0px','20px',{...paused,onUpdate:x=>v.push(x)});a.time=.5;assert.deepEqual(v,['10px']);a.stop();assert.equal(queries,0);
  api.animate('.card',{opacity:1}).stop();assert.equal(queries,1);
 }finally{global.document=prior;}
});
test('plain objects share explicit propEffect bindings and support collections',()=>{
 const s={x:0},v=api.motionValue(0),off=api.propEffect(s,{x:v});
 const a=api.animate(s,{x:20},paused);assert.equal(api.propEffect.get(s,'x'),v);a.time=.5;api.propEffect.flush(s);assert.equal(s.x,10);a.stop();off();
 const objects=[{x:0},{x:10}],seen=[],b=api.animate(objects,{x:20},{...paused,delay:(i,n)=>(seen.push([i,n]),0)});
 assert.deepEqual(seen,[[0,2],[1,2]]);b.time=.5;objects.forEach(s=>api.propEffect.flush(s));assert.deepEqual(objects,[{x:10},{x:15}]);b.stop();objects.forEach(s=>api.propEffect.state(s).release());
});
test('object length fields are properties and inherited readable values become own values',()=>{
 for(const s of [{length:2,x:0},Object.assign(Object.create({x:0}),{label:'x'}),Object.assign(Object.create(null),{x:0})]) {
  const a=api.animate(s,{x:20},paused);a.time=.5;api.propEffect.flush(s);assert.equal(s.x,10);assert.ok(Object.hasOwn(s,'x'));a.stop();api.propEffect.state(s).release();
 }
});
test('unreadable object origins require explicit keyframes and unsafe keys reject',()=>{
 const s={};assert.throws(()=>api.animate(s,{x:20},paused),/cannot be read/);assert.equal(api.propEffect.get(s,'x'),undefined);
 const a=api.animate(s,{x:[0,20]},paused);a.time=.5;api.propEffect.flush(s);assert.equal(s.x,10);a.stop();api.propEffect.state(s).release();
 for(const key of ['__proto__','constructor','prototype'])assert.throws(()=>api.animate({}, {[key]:[0,1]},paused),/unsupported/);
 assert.equal(Object.prototype.x,undefined);
});
test('object animation respects custom effects first and release permits a fresh origin',()=>{
 const subject={x:0},custom=api.createEffect((s,state,k,v)=>state.set(k,v,()=>s.x=v.get()*2),{test:s=>s===subject,read:s=>s.x});
 api.addEffect(custom);const first=api.animate(subject,{x:[0,20]},paused);first.time=.5;custom.flush(subject);assert.equal(subject.x,20);first.stop();custom.state(subject).release();api.removeEffect(custom);
 subject.x=30;const second=api.animate(subject,{x:50},paused);second.time=.5;api.propEffect.flush(subject);assert.equal(subject.x,40);second.stop();api.propEffect.state(subject).release();
});
test('scoped object skip and reduced motion retain grouped cleanup',()=>{
 const scope={current:null,animations:[],skipAnimations:true},s={opacity:0};
 const a=api.createScopedAnimate({scope})(s,{opacity:1},paused);assert.equal(scope.animations[0],a);assert.equal(a.duration,0);a.complete();api.propEffect.flush(s);assert.equal(s.opacity,1);a.stop();api.propEffect.state(s).release();
});
