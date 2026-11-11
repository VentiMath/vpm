"use strict";
const { motionValue, isMotionValue } = require("./value.cjs");
const { interpolate } = require("./mapping.cjs");
const { color } = require("./color.cjs");
const { hasComplexValues } = require("./mix.cjs");
const { prepareMotionValue, getValueTransition, getDefaultTransition, isTransitionDefined } = require("./transition.cjs");
// Keep lifecycle bookkeeping off the hot JSAnimation object. Installing an
// accessor on each controller changes its object shape and deoptimizes ticks.
class SingleValueAnimation {
  constructor(controller) {
    this.controller = controller;
    this.playback = controller.completion;
    this.withLifecycle = true;
    this.completed = false;
    this.stop = () => controller.stop();
  }
  invoke(method, args) {
    const withLifecycle = !this.completed;
    try {
      return this.controller[method](...args);
    } finally {
      if (this.playback !== this.controller.completion) {
        this.playback = this.controller.completion;
        this.withLifecycle = withLifecycle;
        this.combined = undefined;
      }
    }
  }
  get finished() {
    if (!this.withLifecycle) return this.controller.promiseFor(this.playback);
    if (!this.combined) {
      const playback = this.controller.promiseFor(this.playback);
      const merge = (lifecycle) =>
        Promise.race([lifecycle, playback.then(() => {})]);
      this.combined = this.lifecycle
        ? merge(this.lifecycle)
        : (this.ready ??= new Promise((resolve) => {
            this.attach = resolve;
          })).then(({ lifecycle }) => merge(lifecycle));
      this.combined.catch(() => {});
    }
    return this.combined;
  }
  then(resolve, reject) {
    return this.finished.then(resolve, reject);
  }
}
for (const name of [
  "play",
  "pause",
  "cancel",
  "complete",
  "sample",
  "sampleAt",
  "at",
  "tick",
])
  SingleValueAnimation.prototype[name] = function (...args) {
    return this.invoke(name, args);
  };
for (const name of [
  "time",
  "speed",
  "duration",
  "iterationDuration",
  "state",
  "startTime",
])
  Object.defineProperty(SingleValueAnimation.prototype, name, {
    get() {
      return this.controller[name];
    },
    ...(["time", "speed", "state", "startTime"].includes(name)
      ? {
          set(value) {
            this.controller[name] = value;
          },
        }
      : {}),
  });
class StringValueAnimation extends SingleValueAnimation {
  constructor(controller, project) { super(controller); this.project = project; }
  invoke(method, args) {
    const result = super.invoke(method, args);
    if (method === "sample" || method === "tick")
      return { done: result.done, value: this.project(result.value, result.done, this.controller.rawTime, this.controller) };
    if (method === "sampleAt") {
      const c = this.controller;
      return this.project(result, c.sampleResult.done, c.at(args[0]), c);
    }
    return result;
  }
}
const scalarUnit = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i;
function stringPlan(value, target, options) {
  const selected = getValueTransition(options, "");
  if (!selected || typeof selected !== "object" || Array.isArray(selected)) throw new TypeError("transition must be an options object");
  if (selected.from !== undefined && typeof selected.from !== "string" && !Number.isFinite(selected.from)) throw new TypeError("from must be a string or finite number");
  if (selected.finalKeyframe !== undefined) throw new TypeError("string finalKeyframe overrides are not implemented");
  const frames = Array.isArray(target) ? target.slice() : [null, target];
  if (!frames.length) throw new TypeError("keyframes must not be empty");
  for (let i = 0; i < frames.length; i++) {
    if (frames[i] === null) frames[i] = i ? frames[i - 1] : (selected.from ?? value.get());
    if (typeof frames[i] !== "string" && !Number.isFinite(frames[i])) throw new TypeError("single keyframes require strings or finite numbers");
  }
  let unit;
  for (const value of frames) {
    const match = typeof value === "string" && scalarUnit.exec(value.trim());
    if (match?.[2]) {
      if (unit !== undefined && unit !== match[2]) throw new TypeError("single values cannot convert CSS units");
      unit = match[2];
    }
  }
  const numbers = frames.map((_, i) => i * 100);
  const strings = frames.map(String);
  const blend = interpolate(numbers, strings, { clamp: false });
  const settings = { ...selected, delay: selected.delay ?? options.delay, elapsed: options.elapsed };
  if (!isTransitionDefined(selected)) Object.assign(settings, getDefaultTransition("", { keyframes: frames }));
  if (strings.some(v => !color.test(v) && !hasComplexValues(v))) settings.type = false;
  delete settings.from;
  const first = frames[0], last = frames.at(-1);
  const project = (n, done, raw, controller) => {
    if (controller.cancelling || raw < controller.delay) return first;
    if (done) return controller.repeat % 2 === 1 && controller.repeatType !== "loop" ? first : last;
    return blend(n);
  };
  return { numbers, settings, project };
}
function animateSingleValue(subject, target, options = {}) {
  const value = isMotionValue(subject) ? subject : motionValue(subject);
  const initial = value.get();
  if (typeof value.start !== "function" || (typeof initial !== "string" && !Number.isFinite(initial)))
    throw new TypeError("animateSingleValue requires a string or finite numeric value");
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("transition must be an options object");
  const strings = typeof initial === "string" || typeof options.from === "string" || typeof target === "string" || (Array.isArray(target) && target.some(v => typeof v === "string"));
  if (strings) {
    const plan = stringPlan(value, target, options);
    return animatePreparedValue(value, plan.numbers, plan.settings, "", value, plan.project);
  }
  return animatePreparedValue(value, target, options);
}
function animatePreparedValue(
  value,
  target,
  options = {},
  name = "",
  proxy = value,
  project,
) {
  if (!options || typeof options !== "object" || Array.isArray(options))
    throw new TypeError("transition must be an options object");
  const autoplay = options.autoplay !== false;
  let complete,
    startFailure,
    startFailed = false,
    animation;
  let controller;
  if (project) {
    const onUpdate = options.onUpdate;
    if (onUpdate !== undefined && typeof onUpdate !== "function") throw new TypeError("onUpdate must be a function");
    proxy = {
      get: () => target[0], getVelocity: () => 0,
      set() {},
    };
    options = { ...options, onUpdate(n) {
      const next = project(n, controller.result.done, controller.rawTime, controller);
      value.set(next);
      onUpdate?.(next);
    } };
  }
  // Construct and validate while paused, before replacing an existing animation.
  controller = prepareMotionValue(
    name,
    proxy,
    target,
    options,
    true,
  )(() => {
    animation.completed = true;
    complete?.();
  });
  animation = project ? new StringValueAnimation(controller, project) : new SingleValueAnimation(controller);
  let lifecycle;
  try {
    lifecycle = value.start((done) => {
      complete = done;
      try {
        if (autoplay) animation.play();
      } catch (error) {
        startFailed = true;
        startFailure = error;
        try {
          animation.stop();
        } catch {}
        throw error;
      }
      return animation;
    });
  } catch (error) {
    try {
      animation.stop();
    } catch {}
    throw error;
  }
  animation.lifecycle = lifecycle;
  animation.attach?.({ lifecycle });
  lifecycle.catch(() => {});
  if (startFailed) throw startFailure;
  return animation;
}
module.exports = { animateSingleValue };

Object.defineProperty(module.exports, "animatePreparedValue", {
  value: animatePreparedValue,
});
