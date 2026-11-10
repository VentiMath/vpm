"use strict";
function owner(api) {
  const values = new Map();
  return {
    current: {},
    latestValues: { opacity: 1, x: 0, display: "block" },
    getProps: () => ({}),
    getDefaultTransition: () => ({
      duration: 0.2,
      autoplay: false,
      ease: "linear",
    }),
    hasValue: (key) => values.has(key),
    getValue(key, initial) {
      let value = values.get(key);
      if (!value && initial !== undefined)
        values.set(key, (value = api.motionValue(initial)));
      return value;
    },
    addValue: (key, value) => values.set(key, value),
    values,
  };
}
async function drain(api) {
  for (let i = 0; i < 12; i++) {
    for (const step of Object.values(api.frameSteps))
      step.process({ timestamp: 1000, delta: 16, isProcessing: true });
    await Promise.resolve();
  }
}
async function complete(api, renderer, target, options) {
  api.time.set(1000);
  const controls = api.animateTarget(renderer, target, options);
  api.flushKeyframeResolvers();
  controls.forEach((c) => c.complete());
  await drain(api);
  const result = Object.fromEntries(
    [...renderer.values].map(([key, value]) => [key, value.get()]),
  );
  controls.forEach((c) => c.stop());
  return result;
}
module.exports = { owner, drain, complete };
