"use strict";
function effect(api, options = {}) {
  return api.createEffect((subject, state, key, value) => state.set(key, value, () => { subject[key] = value.get(); }), {
    test: subject => !!subject?.custom,
    read: (subject, key) => subject[key],
    ...options,
  });
}
function bindingSnapshot(api, count, step) {
  const jobs = [], writes = [], subject = {}, values = {};
  const e = api.createEffect((s, state, key, value) => state.set(key, value, () => { s[key] = value.get(); writes.push(key); }), step ? { step: job => jobs.push(job) } : {});
  for (let i = 0; i < count; i++) values['v' + i] = api.motionValue(i);
  const detach = e(subject, values);
  const before = { ...subject };
  for (let i = 0; i < count; i++) { values['v' + i].set(i + 1); values['v' + i].set(i + 2); }
  e.flush(subject);
  const after = { ...subject }, rendered = [...writes];
  const released = [...e.state(subject).release()].map(([key, v]) => [key, v.get()]);
  detach(); Object.values(values).forEach(v => v.set(100)); e.flush(subject);
  return { before, after, rendered, released, final: { ...subject }, bound: !!e.get(subject, 'v0') };
}
function animationSnapshot(api, frames, options) {
  const e = effect(api), subject = { custom: true, x: 5, opacity: .5, backgroundColor: '#000' };
  const animations = api.animateEffectSubject(e, subject, frames, { ...options, autoplay: false });
  const samples = [];
  for (const time of [0, .1, .25, .5, 1, 2]) {
    animations.forEach(a => a.time = time);
    api.frameSteps.update.process({ timestamp: 1000, delta: 16, isProcessing: true });
    e.flush(subject); samples.push({ ...subject });
  }
  animations.forEach(a => a.stop()); e.state(subject).release();
  return samples;
}
module.exports = { effect, bindingSnapshot, animationSnapshot };
