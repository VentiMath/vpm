"use strict";
const { motionValue } = require("./value.cjs");
const {
  DOMKeyframesResolver,
  flushKeyframeResolvers,
} = require("./resolver.cjs");
const { readStyleValue, readSVGValue } = require("./reads.cjs");
const {
  styleEffect,
  svgEffect,
  releaseElement: releaseEffects,
} = require("./effects.cjs");
const {
  getValueTransition,
  getDefaultTransition,
  isTransitionDefined,
  prepareMotionValue,
} = require("./transition.cjs");
const owners = new WeakMap(),
  requests = new WeakMap();
const scalar = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i;
const unsafe = new Set(["__proto__", "prototype", "constructor"]);
function object(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TypeError(name + " must be an object");
}
function snapshot(value) {
  object(value, "transition");
  const result = { ...value };
  for (const key of ["onUpdate", "onComplete", "onPlay", "onStop"])
    if (result[key] !== undefined && typeof result[key] !== "function")
      throw new TypeError(key + " must be a function");
  if (Array.isArray(result.times)) result.times = result.times.slice();
  if (Array.isArray(result.ease))
    result.ease = result.ease.map((x) => (Array.isArray(x) ? x.slice() : x));
  return result;
}
function prepareFrames(input) {
  const frames = Array.isArray(input) ? input.slice() : [null, input];
  if (!frames.length) throw new TypeError("keyframes must not be empty");
  for (const v of frames)
    if (
      v !== null &&
      !Number.isFinite(v) &&
      !(
        typeof v === "string" &&
        (scalar.test(v.trim()) ||
          v.trim().startsWith("var(") ||
          v === "auto" ||
          v.startsWith("calc("))
      )
    )
      throw new TypeError(
        "element animations currently support numeric values and CSS units, variables or measured lengths",
      );
  return frames;
}
function decode(frames) {
  // The resolver hands this callback an owned snapshot, so numeric conversion
  // can reuse it without changing the caller's data or the resolver's source.
  let unit;
  for (let i = 0; i < frames.length; i++) {
    const value = frames[i];
    if (typeof value === "number") continue;
    const match = scalar.exec(value.trim());
    if (!match || !Number.isFinite(Number(match[1])))
      throw new TypeError(
        "resolved keyframes require finite numbers or matching CSS units",
      );
    if (unit !== undefined && unit !== match[2])
      throw new TypeError("resolved keyframes have incompatible CSS units");
    unit = match[2];
    frames[i] = Number(match[1]);
  }
  return { numbers: frames, format: unit ? (n) => n + unit : undefined };
}

class ElementResolver extends DOMKeyframesResolver {}
for (const method of [
  "readKeyframes",
  "prepareMeasurement",
  "renderStartStyles",
  "measureInitialState",
  "renderEndStyles",
  "measureEndState",
  "restore",
]) {
  ElementResolver.prototype[method] = function (...args) {
    try {
      return DOMKeyframesResolver.prototype[method].apply(this, args);
    } catch (error) {
      this.failure(error);
      throw error;
    }
  };
}
class ElementAnimation {
  constructor(value, key, frames, options, element, bind, owned) {
    this.value = value;
    this.key = key;
    this.options = options;
    this.bind = bind;
    this.owned = owned;
    this.autoplay = options.autoplay !== false;
    this.stopped = false;
    this.cancelled = false;
    this.completed = false;
    this.wait();
    this.resolver = new ElementResolver(
      frames,
      (resolved, final) => this.start(resolved, final),
      key,
      value,
      element,
    );
    this.resolver.failure = (error) => this.fail(error);
    this.stop = () => {
      if (this.stopped) return;
      this.stopped = true;
      this.resolver.cancel();
      try {
        this.animation?.stop();
      } finally {
        if (!this.animation) this.resolveReady();
      }
    };
  }
  wait() {
    this.waitState = { settled: false, failed: false };
  }
  resolveReady() {
    this.waitState.settled = true;
    this.waitState.resolve?.();
  }
  waitingPromise() {
    const state = this.waitState;
    if (!state.promise) {
      state.promise = new Promise((resolve, reject) => {
        state.resolve = resolve;
        state.reject = reject;
        if (state.failed) reject(state.error);
        else if (state.settled) resolve();
      });
      state.promise.catch(() => {});
    }
    return state.promise;
  }
  fail(error) {
    this.failed = true;
    if (requests.get(this.value) === this) {
      if (this.previous?.animation) requests.set(this.value, this.previous);
      else requests.delete(this.value);
    }
    this.previous = undefined;
    this.waitState.failed = true;
    this.waitState.error = error;
    this.waitState.reject?.(error);
  }
  start(frames, final) {
    if (this.stopped || this.cancelled || !this.owned()) return;
    try {
      const { numbers, format } = decode(frames);
      const options = this.options;
      if (!isTransitionDefined(options)) {
        const defaults = getDefaultTransition(this.key, { keyframes: numbers });
        for (const key of Object.keys(defaults))
          if (!Object.hasOwn(options, key)) options[key] = defaults[key];
      }
      const onUpdate = options.onUpdate,
        onComplete = options.onComplete;
      const reverse =
        (options.repeatType === "reverse" || options.repeatType === "mirror") &&
        options.repeat % 2 === 1;
      const proxy = format
        ? {
            get: () => numbers[0],
            getVelocity: () => this.value.getVelocity(),
            set: (n) => {
              this.value.set(format(n));
            },
          }
        : this.value;
      options.autoplay = false;
      options.onUpdate =
        onUpdate && (format ? (n) => onUpdate(format(n)) : onUpdate);
      options.onComplete = () => {
        this.completed = true;
        if (final !== undefined && !reverse && this.animation.speed >= 0)
          this.value.set(final);
        onComplete?.();
      };
      let complete;
      // Validate before replacing the currently running value. This facade owns
      // the lifecycle directly instead of allocating a second control wrapper.
      this.animation = prepareMotionValue(
        this.key,
        proxy,
        numbers,
        options,
        true,
        true,
      )(() => {
        this.lifecycleCompleted = true;
        complete?.();
      });
      this.completionState = this.animation.completion;
      this.withLifecycle = true;
      this.lifecycle = this.value.start((done) => {
        complete = done;
        return this;
      });
      this.lifecycle.catch(() => {});
      if (this.stopped || !this.owned()) {
        this.animation.stop();
        if (this.waitState.promise) {
          const state = this.waitState;
          this.finished.then(state.resolve, state.reject);
        }
        return;
      }
      this.previous = undefined;
      this.bind();
      if (this.pendingSpeed !== undefined)
        this.animation.speed = this.pendingSpeed;
      if (this.autoplay && !this.completed) this.animation.play();
      if (this.waitState.promise) {
        const state = this.waitState;
        this.finished.then(state.resolve, state.reject);
      }
    } catch (error) {
      try {
        this.animation?.stop();
      } catch {}
      this.fail(error);
      throw error;
    }
  }
  ensure() {
    if (!this.animation && !this.stopped && !this.cancelled && !this.failed)
      flushKeyframeResolvers();
    return this.animation;
  }
  get finished() {
    if (this.failed || !this.animation || !this.lifecycle)
      return this.waitingPromise();
    if (this.completionState !== this.animation.completion) {
      this.completionState = this.animation.completion;
      this.withLifecycle = !this.lifecycleCompleted;
      this.combined = undefined;
    }
    if (!this.withLifecycle) return this.animation.finished;
    if (!this.combined) {
      this.combined = Promise.race([
        this.lifecycle,
        this.animation.finished.then(() => {}),
      ]);
      this.combined.catch(() => {});
    }
    return this.combined;
  }

  then(resolve, reject) {
    return this.finished.then(resolve, reject);
  }
  get state() {
    return (
      this.animation?.state ??
      (this.stopped || this.cancelled ? "idle" : "paused")
    );
  }
  get duration() {
    return this.ensure()?.duration ?? 0;
  }
  get iterationDuration() {
    return this.ensure()?.iterationDuration ?? 0;
  }
  get time() {
    return (this.ensure()?.rawTime ?? 0) / 1000;
  }
  set time(t) {
    if (!Number.isFinite(t)) throw new RangeError("time must be finite");
    const a = this.ensure();
    if (a) a.time = t - a.delay / 1000;
  }
  get speed() {
    return this.animation?.speed ?? this.pendingSpeed ?? 1;
  }
  set speed(s) {
    if (!Number.isFinite(s)) throw new RangeError("speed must be finite");
    this.pendingSpeed = s;
    if (this.animation) this.animation.speed = s;
  }
  pause() {
    this.autoplay = false;
    this.animation?.pause();
  }
  play() {
    if (this.stopped || this.failed || !this.owned()) return;
    this.autoplay = true;
    this.completed = false;
    if (this.animation) this.animation.play();
    else if (this.cancelled) {
      this.cancelled = false;
      this.wait();
      this.resolver.resume();
    }
  }
  cancel() {
    if (this.stopped) return;
    this.completed = false;
    if (this.animation) this.animation.cancel();
    else {
      this.cancelled = true;
      this.resolver.cancel();
      this.resolveReady();
    }
  }
  complete() {
    this.ensure()?.complete();
  }
}
function plan(getValue, keyframes, transition, element, bind, registry) {
  object(keyframes, "keyframes");
  object(transition, "transition");
  if (keyframes.transitionEnd !== undefined)
    throw new TypeError("transitionEnd is not implemented");
  const entries = [];
  for (const key of Object.keys(keyframes)) {
    if (
      key === "transition" ||
      key === "transitionEnd" ||
      keyframes[key] === undefined
    )
      continue;
    if (unsafe.has(key)) throw new TypeError("unsafe animation property");
    const options = snapshot(getValueTransition(transition, key));
    if (options.delay == null && transition.delay !== undefined)
      options.delay = transition.delay;
    if (transition.elapsed !== undefined) options.elapsed = transition.elapsed;
    const frames = prepareFrames(keyframes[key]);
    if (options.from !== undefined) {
      if (frames[0] === null) frames[0] = options.from;
      options.from = undefined;
    }
    if (
      transition.skipAnimations ||
      (transition.reduceMotion &&
        /^(?:x|y|z|scale.*|rotate.*|translate.*|skew.*|transformPerspective)$/.test(
          key,
        ))
    )
      options.type = false;
    entries.push({ key, frames, options });
  }
  const handles = [];
  try {
    for (const { key, frames, options } of entries) {
      const value = getValue(key);
      if (!value || typeof value.start !== "function")
        throw new TypeError("getValue must return a MotionValue");
      let handle;
      const owned = () => requests.get(value) === handle;
      handle = new ElementAnimation(
        value,
        key,
        frames,
        options,
        element,
        () => bind(key, value),
        owned,
      );
      const previous = requests.get(value);
      if (previous && !previous.animation) previous.stop();
      handle.previous = previous?.animation ? previous : undefined;
      requests.set(value, handle);
      registry.set(key, handle);
      handles.push(handle);
    }
    for (const h of handles) h.resolver.scheduleResolve();
  } catch (error) {
    for (const h of handles) h.stop();
    throw error;
  }
  return handles;
}
function animateElement(element, keyframes, transition = {}, visualElement) {
  if (visualElement !== undefined)
    throw new TypeError("VisualElement renderer handoff is not implemented");
  if (element?.nodeType !== 1 || !element.style)
    throw new TypeError("animateElement requires one HTML or SVG element");
  const svg = element.namespaceURI === "http://www.w3.org/2000/svg";
  const effect = svg ? svgEffect : styleEffect;
  let registry = owners.get(element);
  if (!registry) owners.set(element, (registry = new Map()));
  const reader = {
    current: element,
    readValue: (key) =>
      svg ? readSVGValue(element, key) : readStyleValue(element, key),
  };
  const handles = plan(
    (key) => {
      let value = effect.get(element, key) || registry.get(key)?.value;
      if (!value) value = motionValue(undefined);
      return value;
    },
    keyframes,
    transition,
    reader,
    (key, value) => {
      if (effect.get(element, key) !== value) effect(element, { [key]: value });
    },
    registry,
  );
  return handles;
}
function animateValues(getValue, keyframes, transition = {}, element) {
  if (typeof getValue !== "function")
    throw new TypeError("getValue must be a function");
  return plan(getValue, keyframes, transition, element, () => {}, new Map());
}
function releaseElement(element) {
  const registry = owners.get(element);
  let failure;
  if (registry) {
    owners.delete(element);
    for (const h of registry.values())
      try {
        h.stop();
      } catch (error) {
        failure ??= { error };
      }
  }
  let result;
  try {
    result = releaseEffects(element);
  } catch (error) {
    failure ??= { error };
  }
  if (result)
    for (const value of result.values())
      try {
        value.stop();
      } catch (error) {
        failure ??= { error };
      }
  if (failure) throw failure.error;
  return result;
}
module.exports = { animateElement, animateValues, releaseElement };
