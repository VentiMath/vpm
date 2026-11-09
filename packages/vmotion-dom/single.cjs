"use strict";
const { motionValue, isMotionValue } = require("./value.cjs");
const {
  animateMotionValue,
  getDefaultTransition,
  isTransitionDefined,
} = require("./transition.cjs");
// Keep lifecycle bookkeeping off the hot JSAnimation object. Installing an
// accessor on each controller changes its object shape and deoptimizes ticks.
class SingleValueAnimation {
  constructor(controller) {
    this.controller = controller;
    this.playback = controller.finished;
    this.withLifecycle = true;
    this.completed = false;
    this.stop = () => this.invoke("stop", []);
  }
  invoke(method, args) {
    const withLifecycle = !this.completed;
    try {
      return this.controller[method](...args);
    } finally {
      if (this.playback !== this.controller.finished) {
        this.playback = this.controller.finished;
        this.withLifecycle = withLifecycle;
        this.combined = undefined;
      }
    }
  }
  get finished() {
    if (!this.withLifecycle) return this.playback;
    if (!this.combined) {
      const playback = this.playback;
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
function animateSingleValue(subject, target, options = {}) {
  const value = isMotionValue(subject) ? subject : motionValue(subject);
  if (typeof value.start !== "function" || !Number.isFinite(value.get()))
    throw new TypeError("animateSingleValue requires a finite numeric value");
  if (!options || typeof options !== "object" || Array.isArray(options))
    throw new TypeError("transition must be an options object");
  const transition = isTransitionDefined(options)
    ? options
    : {
        ...getDefaultTransition("", {
          keyframes: Array.isArray(target) ? target : [null, target],
        }),
        ...options,
      };
  const autoplay = transition.autoplay !== false;
  let complete,
    startFailure,
    startFailed = false,
    animation;
  // Construct and validate while paused, before replacing an existing animation.
  const controller = animateMotionValue("", value, target, {
    ...transition,
    autoplay: false,
  })(() => {
    animation.completed = true;
    complete?.();
  });
  animation = new SingleValueAnimation(controller);
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
