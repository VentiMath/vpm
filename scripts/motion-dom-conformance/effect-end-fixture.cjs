"use strict";
const { effect } = require("./custom-effect-fixture.cjs");
async function drain(api, e, s) {
  // Two complete frame cycles allow the upstream completion promise and its
  // deferred end-value write to run. Neither implementation has a live RAF.
  for (let cycle = 0; cycle < 3; cycle++) {
    for (let i = 0; i < 8; i++) await Promise.resolve();
    for (const phase of ["read", "update", "preRender", "render", "postRender"])
      api.frameSteps[phase].process({
        timestamp: 1000 + cycle * 16,
        delta: 16,
        isProcessing: true,
      });
    e.flush(s);
  }
}
async function snapshot(api, count, mode, animate = api.animate) {
  const e = mode === "object" ? api.propEffect : effect(api),
    s = { custom: true, hidden: 0 },
    frames = {},
    end = { hidden: 1 };
  for (let i = 0; i < count; i++) {
    s["v" + i] = 0;
    frames["v" + i] = [0, 20];
    end["v" + i] = 30;
  }
  const target = { ...frames, transitionEnd: end },
    options = { duration: 1, ease: "linear", autoplay: false };
  if (mode === "registered") api.addEffect(e);
  const group = mode === "direct" ? undefined : animate(s, target, options);
  const handles =
    group?.animations ||
    (mode === "direct"
      ? api.animateEffectSubject(e, s, target, options)
      : undefined);
  const before = { ...s };
  if (group) group.complete();
  else handles.forEach((a) => a.complete());
  await drain(api, e, s);
  const after = { ...s };
  if (group) group.stop();
  else handles.forEach((a) => a.stop());
  e.state(s)?.release();
  if (mode === "registered") api.removeEffect(e);
  return { before, after };
}
module.exports = { drain, snapshot, effect };
