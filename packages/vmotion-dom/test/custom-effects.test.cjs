"use strict";
const { test } = require("node:test"), assert = require("node:assert/strict");
const api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
const frame = { timestamp: 1000, delta: 16, isProcessing: true };
function make(options = {}) {
  return api.createEffect((subject, state, key, value) => state.set(key, value, () => { subject[key] = value.get(); }),
    { test: subject => subject?.custom === true, read: (subject, key) => subject[key], ...options });
}
test("custom effects defer, coalesce, flush and detach their own bindings", () => {
  const s = { custom: true }, effect = make(), a = api.motionValue(0), b = api.motionValue(10);
  const off = effect(s, { x: a });
  assert.equal(s.x, undefined);
  a.set(1); a.set(2); effect.flush(s);
  assert.equal(s.x, 2);
  const replace = effect(s, { x: b });
  off(); a.set(30); effect.flush(s);
  assert.equal(s.x, 10);
  assert.equal(effect.get(s, "x"), b);
  replace(); replace(); b.set(40); effect.flush(s);
  assert.equal(s.x, 10); assert.equal(effect.get(s, "x"), undefined);
});
test("state releases subscriptions and supports computed renders", () => {
  const state = new api.MotionValueState(), parent = api.motionValue(0), child = api.motionValue(1);
  let count = 0;
  state.set("transform", parent, () => count++);
  state.set("x", child, undefined, parent);
  state.flush(); assert.equal(count, 1);
  child.set(2); child.set(3); state.flush(); assert.equal(count, 2);
  assert.deepEqual([...state.release()], [["transform", parent], ["x", child]]);
  child.set(4); state.flush(); assert.equal(count, 2);
  assert.equal(state.get("x"), undefined);
});
test("state scheduling is configurable, stale scheduled work is harmless", () => {
  const jobs = [], state = new api.MotionValueState(fn => jobs.push(fn)), value = api.motionValue(0), seen = [];
  const off = state.set("x", value, () => seen.push(value.get()));
  value.set(2); assert.equal(jobs.length, 1);
  state.flush(); assert.deepEqual(seen, [2]);
  jobs[0](); assert.deepEqual(seen, [2]);
  value.set(3); off(); jobs.at(-1)(); assert.deepEqual(seen, [2]);
});
test("reentrant renders wait for a later flush and failed renders do not strand siblings", () => {
  const state = new api.MotionValueState(), x = api.motionValue(0), y = api.motionValue(0), seen = [];
  state.set("x", x, () => { seen.push(x.get()); if (x.get() === 0) x.set(1); else throw 0; });
  state.set("y", y, () => seen.push("y"));
  state.flush(); assert.deepEqual(seen, [0, "y"]);
  y.set(1); assert.throws(() => state.flush(), error => error === 0);
  assert.deepEqual(seen, [0, "y", 1, "y"]);
  state.release();
});
test("failed effect binding rolls back subscriptions and preserves existing cleanup ownership", () => {
  const effect = api.createEffect((subject, state, key, value) => {
    const off = state.set(key, value, () => subject[key] = value.get());
    if (key === "bad") throw Error("bind failed");
    return off;
  });
  const s = {}, old = api.motionValue(1), next = api.motionValue(2), bad = api.motionValue(3);
  const detachOld = effect(s, { x: old }); effect.flush(s);
  assert.throws(() => effect(s, { x: next, bad }), /bind failed/);
  assert.equal(effect.get(s, "x"), old); assert.equal(effect.get(s, "bad"), undefined);
  old.set(4); next.set(5); bad.set(6); effect.flush(s); assert.equal(s.x, 4);
  detachOld(); old.set(7); effect.flush(s); assert.equal(s.x, 4);
});
test("effects validate before binding, cleanup all keys despite a throwing teardown", () => {
  let calls = 0, cleaned = 0;
  const effect = api.createEffect((subject, state, key, value) => {
    calls++; const off = state.set(key, value, () => {});
    return () => { off(); cleaned++; if (key === "x") throw null; };
  });
  const s = {}, v = api.motionValue(0);
  assert.throws(() => effect(s, { x: v, y: 12 }), /MotionValue/); assert.equal(calls, 0);
  for (const key of ["__proto__", "constructor", "prototype"])
    assert.throws(() => effect(s, { [key]: v }), /unsafe/);
  const off = effect(s, { x: v, y: v });
  assert.throws(off, e => e === null); assert.equal(cleaned, 2); off();
  assert.equal(effect.get(s, "x"), undefined); assert.equal(effect.get(s, "y"), undefined);
});
test("registration is newest-first, deduplicated and removal does not stop active bindings", () => {
  const a = make(), b = make(), s = { custom: true, x: 0 };
  try {
    api.addEffect(a); api.animate.addEffect(b); api.addEffect(b);
    assert.equal(api.findEffect(s), b);
    const g = api.animate(s, { x: [0, 20] }, { duration: 1, ease: "linear", autoplay: false });
    api.animate.removeEffect(b); assert.equal(api.findEffect(s), a);
    g.time = .5; b.flush(s); assert.equal(s.x, 10);
    g.stop(); b.state(s).release();
    api.removeEffect(a); assert.equal(api.findEffect(s), undefined);
    const fallback = api.animate(s, { x: 20 }, { autoplay: false });
    fallback.stop(); api.propEffect.state(s).release();
  } finally { api.removeEffect(a); api.removeEffect(b); }
});
test("custom animation reads missing origins once, snapshots frames and supports colors", async () => {
  const seen = [], effect = make({ read(s, key, target) { seen.push(target); return s[key]; } });
  const subject = { custom: true, x: 5, color: "#000" };
  const frames = [null, 25];
  const animations = api.animateEffectSubject(effect, subject, { x: frames, color: "#fff" }, { duration: 1, ease: "linear", autoplay: false });
  frames[1] = 100; assert.deepEqual(seen, [[null, 25], "#fff"]);
  animations.forEach(a => a.time = .5); effect.flush(subject);
  assert.equal(subject.x, 15); assert.equal(subject.color, "rgba(180, 180, 180, 1)");
  animations.forEach(a => a.complete()); await Promise.all(animations.map(a => a.finished)); effect.flush(subject);
  assert.equal(subject.x, 25); assert.equal(subject.color, "rgba(255, 255, 255, 1)");
  const [again] = api.animateEffectSubject(effect, subject, { x: 45 }, { duration: 1, ease: "linear", autoplay: false });
  again.time = .5; effect.flush(subject); assert.equal(subject.x, 35); assert.equal(seen.length, 2);
  again.stop(); effect.state(subject).release();
});
test("custom animation setup failure removes newly bound values", () => {
  const s = { x: 0 }, effect = make();
  assert.throws(() => api.animateEffectSubject(effect, s, { x: 1 }, { duration: -1 }), /duration/);
  assert.equal(effect.get(s, "x"), undefined);
});
test("scoped custom collections capture dynamic delays and respect reduced motion", () => {
  const effect = make(), subjects = [{ custom: true, x: 0 }, { custom: true, x: 0 }];
  const scope = { current: null, animations: [], reduceMotion: true };
  api.addEffect(effect);
  try {
    const seen = [];
    const group = api.createScopedAnimate({ scope })(subjects, { x: 20 }, { autoplay: false, delay: (i, n) => { seen.push([i, n]); return 0; } });
    assert.deepEqual(seen, [[0, 2], [1, 2]]); assert.equal(scope.animations[0], group);
    group.complete(); subjects.forEach(s => effect.flush(s));
    assert.equal(subjects[0].x, 20); assert.equal(subjects[1].x, 20);
    group.stop(); subjects.forEach(s => effect.state(s).release());
  } finally { api.removeEffect(effect); }
});
test("custom scheduling can use preRender and DOM subjects retain the DOM renderer", () => {
  const effect = make({ step: api.frame.preRender }), s = { custom: true }, value = api.motionValue(2);
  const off = effect(s, { x: value });
  api.frameSteps.render.process(frame); assert.equal(s.x, undefined);
  api.frameSteps.preRender.process(frame); assert.equal(s.x, 2); off();
  const broad = make({ test: () => true }); api.addEffect(broad);
  const node = { nodeType: 1, style: {}, ownerDocument: { defaultView: {} } };
  try {
    const g = api.animate(node, { opacity: [0, 1] }, { duration: 1, ease: "linear", autoplay: false });
    g.time = .5; api.styleEffect.flush(node); assert.equal(node.style.opacity, .5);
    assert.equal(broad.state(node), undefined); g.stop(); api.styleEffect.state(node).release();
  } finally { api.removeEffect(broad); }
});
test("optional renderer defers custom reads and receives owned token frames", () => {
  let reads = 0;
  class R extends api.KeyframeResolver {
    constructor(...args) { super(...args); this.isAsync = true; }
    readKeyframes() { reads++; this.unresolvedKeyframes = [0, 20]; super.readKeyframes(); }
  }
  const s = { x: 5 }, effect = make({ read() { assert.fail('renderer owns the read'); } });
  const [a] = api.animateEffectSubject(effect, s, { x: 'token' }, { duration: 1, ease: 'linear', autoplay: false }, { current: s, KeyframeResolver: R });
  assert.equal(reads, 0); a.time = .5; effect.flush(s); assert.equal(reads, 1); assert.equal(s.x, 10);
  a.stop(); effect.state(s).release();
});
test("computed cycles terminate and a stale binding cannot remove its replacement", () => {
  const state = new api.MotionValueState(), a = api.motionValue(0), b = api.motionValue(1);
  const old = state.set('a', a, undefined, b);
  state.set('b', b, undefined, a); state.flush();
  const next = api.motionValue(3); state.set('a', next, () => {}); old();
  assert.equal(state.get('a'), next); state.flush(); state.release();
});
test("registration predicates run against a snapshot and invalid registration rejects", () => {
  const subject = { custom: true }, a = make(), b = make({ test: () => { api.removeEffect(a); return false; } });
  try {
    api.addEffect(a); api.addEffect(b);
    assert.equal(api.findEffect(subject), a);
    assert.equal(api.findEffect(subject), undefined);
    assert.throws(() => api.addEffect(api.createEffect(() => () => {})), /test/);
  } finally { api.removeEffect(a); api.removeEffect(b); }
});
test("flush removal and reentrant writes keep the next batch isolated", () => {
  const state = new api.MotionValueState(), a = api.motionValue(0), b = api.motionValue(0), c = api.motionValue(0), seen = [];
  let offB;
  state.set('a', a, () => { seen.push('a'); offB(); c.set(2); });
  offB = state.set('b', b, () => seen.push('b'));
  state.set('c', c, () => seen.push(c.get()));
  state.flush(); assert.deepEqual(seen, ['a', 2]);
  state.flush(); assert.deepEqual(seen, ['a', 2, 2]);
  state.release();
});
