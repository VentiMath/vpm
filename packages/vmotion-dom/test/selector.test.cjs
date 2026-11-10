"use strict";
const { test } = require("node:test"), assert = require("node:assert/strict"),
  api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
function element(svg = false) {
  return { nodeType: 1, style: { setProperty(k,v) { this[k] = String(v); } },
    namespaceURI: svg ? "http://www.w3.org/2000/svg" : "http://www.w3.org/1999/xhtml",
    setAttribute(k,v) { this[k] = String(v); },
    ownerDocument: { defaultView: { getComputedStyle: () => ({opacity:"0", transform:"none",getPropertyValue:()=>""}) } } };
}
const options = {duration:1,ease:"linear",autoplay:false};
function dispose(nodes) { for(const node of nodes) api.releaseElement(node); }
test("selector wrapper scopes fresh queries and snapshots each element list", async () => {
  const a = element(), b = element(); let nodes=[a], calls=0;
  const scope={current:{querySelectorAll(s){assert.equal(s,".item");calls++;return nodes}},animations:[]};
  const animate=api.createScopedAnimate({scope});
  const first=animate(".item",{opacity:[0,1]},options); nodes=[b];
  first.time=.5;api.styleEffect.flush(a);assert.equal(Number(a.style.opacity),.5);assert.equal(b.style.opacity,undefined);
  const second=animate(".item",{opacity:[0,1]},options); second.complete();api.styleEffect.flush(b);
  assert.equal(Number(b.style.opacity),1);assert.equal(calls,2);assert.deepEqual(scope.animations,[first,second]);
  first.stop();second.stop();await first.finished;dispose([a,b]);
});
test("selector stagger evaluates once per element and preserves per-property delay", () => {
  const nodes=[element(),element(),element()], calls=[];
  const control=api.animate(nodes,{opacity:[0,1],x:[0,10]},{...options,delay:(i,total)=>{calls.push([i,total]);return i*.1},x:{...options,delay:.25}});
  control.time=.5;
  nodes.forEach((n,i)=>{api.styleEffect.flush(n);assert.ok(Math.abs(Number(n.style.opacity)-(.5-i*.1))<1e-12);assert.equal(n.style.transform,"translateX(2.5px)")});
  assert.deepEqual(calls,[[0,3],[1,3],[2,3]]);control.stop();dispose(nodes);
});
test("selector captures keyframes and nested options before delay callbacks mutate inputs", () => {
  const nodes=[element(),element()], frames={opacity:[0,1]}, opts={...options,opacity:{...options},delay:i=>{frames.opacity[1]=20;opts.opacity.duration=20;return 0}};
  const group=api.animate(nodes,frames,opts);group.time=.5;
  for(const n of nodes){api.styleEffect.flush(n);assert.equal(Number(n.style.opacity),.5)}
  group.stop();dispose(nodes);
});
test("invalid elements and failed dynamic delays do not start earlier elements", () => {
  const a=element();assert.throws(()=>api.animate([a,{}],{opacity:[0,1]},options),/elements/);
  assert.throws(()=>api.animate([a,element()],{opacity:[0,1]},{...options,delay:i=>i?Infinity:0}),/finite/);
  assert.equal(api.styleEffect.get(a,"opacity"),undefined);
  assert.throws(()=>api.animate(a,JSON.parse('{"__proto__":1}'),options),/unsupported/);
  assert.throws(()=>api.animate(a,{transitionEnd:{opacity:0}},options),/unsupported/);
});
test("later element setup failure stops all controls started by this invocation", () => {
  const a=element(),b=element();Object.defineProperty(b,"namespaceURI",{get(){throw Error("later element")}});
  assert.throws(()=>api.animate([a,b],{opacity:[0,1]},options),/later element/);
  assert.equal(api.styleEffect.get(a,"opacity").animation.state,"idle");
  dispose([a]);
});
test("selector wrapper supports SVG and cross-window nodes without global constructors", () => {
  const n=element(true), a=api.animate(n,{opacity:[0,1]},options);a.time=.5;api.svgEffect.flush(n);assert.equal(Number(n.opacity),.5);a.stop();dispose([n]);
});
test("empty matches resolve, frozen scope bookkeeping cleans up and scalar controls work", async () => {
  const empty=api.animate([],{opacity:1},options);assert.equal(empty.duration,0);await empty;empty.stop();
  const n=element(),scope={current:null,animations:Object.freeze([])};
  assert.throws(()=>api.createScopedAnimate({scope})(n,{opacity:[0,1]},options));
  assert.equal(api.styleEffect.get(n,"opacity").animation.state,"idle");dispose([n]);
  const value=api.motionValue(0),control=api.animate(value,10,options);control.time=.5;assert.equal(value.get(),5);control.complete();await control;assert.equal(value.get(),10);
});
test("scoped skip/reduce settings affect current calls and retain opacity transitions", () => {
  const n=element(),scope={current:null,animations:[],reduceMotion:true};
  const animate=api.createScopedAnimate({scope});const a=animate(n,{x:[0,10],opacity:[0,1]},options);a.time=.5;api.styleEffect.flush(n);
  assert.equal(n.style.transform,"translateX(10px)");assert.equal(Number(n.style.opacity),.5);a.stop();
  scope.skipAnimations=true;const b=animate(n,{opacity:[0,1]},options);b.complete();api.styleEffect.flush(n);assert.equal(Number(n.style.opacity),1);b.stop();dispose([n]);
});
test("invalid selector syntax propagates and unsupported sequences reject", () => {
  const animate=api.createScopedAnimate({scope:{current:{querySelectorAll(){throw new SyntaxError("selector")}},animations:[]}});
  assert.throws(()=>animate("[",{opacity:1},options),SyntaxError);
  assert.throws(()=>api.animate([[element(),{opacity:1}]],options),/elements/);
});

test("selector group reports deferred read failures and stopped work stays stopped", async () => {
  const n=element(), group=api.animate(n,{opacity:"var(--missing)"},options);
  const result=group.finished;
  assert.throws(()=>api.flushKeyframeResolvers(),/unresolved CSS variable/);
  await assert.rejects(result,/unresolved CSS variable/);group.stop();dispose([n]);
  const other=element(), stopped=api.animate(other,{opacity:1},options);stopped.stop();api.flushKeyframeResolvers();api.styleEffect.flush(other);
  assert.equal(other.style.opacity,undefined);await stopped.finished;dispose([other]);
});

test("selector wrapper reads reduced-motion preference from each owner window", () => {
  const n=element();n.ownerDocument.defaultView.matchMedia = () => ({matches:true});
  const a=api.animate(n,{x:[0,10],opacity:[0,1]},options);a.time=.5;api.styleEffect.flush(n);
  assert.equal(n.style.transform,"translateX(10px)");assert.equal(Number(n.style.opacity),.5);a.stop();
  const b=api.createScopedAnimate({reduceMotion:false})(n,{x:[0,10]},options);b.time=.5;api.styleEffect.flush(n);
  assert.equal(n.style.transform,"translateX(5px)");b.stop();dispose([n]);
});
