"use strict";
function globals() { require('./handoff-fixture.cjs').globals(); global.NodeList ??= class {}; }
function stringSnapshot(api, initial, target, options, owned = false) {
  let now = 1000, tick, updates = [];
  api.time.set(now);
  const subject = owned ? api.motionValue(initial) : initial;
  const animation = api.animateSingleValue(subject, target, { ...options,
    driver: fn => ((tick = fn), { now: () => now, start() {}, stop() {} }),
    onUpdate: x => updates.push(x),
  });
  for (const t of [1000,1050,1100,1250,1500,1750,2000,2500,3000,3500]) { now = t; api.time.set(t); tick(t); }
  const duration = animation.duration;
  animation.stop();
  return { updates, duration, final: owned ? subject.get() : undefined };
}
function objectSnapshot(api, animate, initial, frames, options) {
  const subject = { ...initial }, samples = [];
  api.time.set(1000);
  const group = animate(subject, frames, { ...options, autoplay: false });
  api.flushKeyframeResolvers();
  let timestamp = 1000;
  for (const t of [0,.1,.25,.5,1,2]) {
    timestamp += 16; api.time.set(timestamp);
    group.time = t;
    for (const phase of ["read", "resolveKeyframes", "update", "render"])
      api.frameSteps[phase].process({ timestamp, delta: 16, isProcessing: true });
    api.propEffect.flush?.(subject); samples.push({ ...subject });
  }
  group.stop(); api.propEffect.state?.(subject)?.release();
  return samples;
}
module.exports = { globals, stringSnapshot, objectSnapshot };
