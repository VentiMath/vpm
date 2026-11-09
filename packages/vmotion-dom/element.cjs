"use strict";
const { motionValue, failAnimation } = require("./value.cjs");
const {
  DOMKeyframesResolver,
  KeyframeResolver,
  trackResolver,
  untrackResolver,
  noteResolverRead,
  resetResolverRead,
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
function prepareFrames(input, custom = false) {
  const frames = Array.isArray(input) ? input.slice() : [null, input];
  if (!frames.length) throw new TypeError("keyframes must not be empty");
  for (const v of frames)
    if (
      v !== null &&
      !Number.isFinite(v) &&
      !(
        typeof v === "string" &&
        (custom ||
          scalar.test(v.trim()) ||
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

const resolverClasses = new WeakMap(),
  resolverOwners = new WeakMap();
const resolverMethods = [
  "scheduleResolve",
  "resume",
  "readKeyframes",
  "prepareMeasurement",
  "renderStartStyles",
  "measureInitialState",
  "renderEndStyles",
  "measureEndState",
  "restore",
];
function guardedResolver(Base) {
  if (typeof Base !== "function")
    throw new TypeError("KeyframeResolver must be a constructor");
  let Guarded = resolverClasses.get(Base);
  if (Guarded) return Guarded;
  Guarded = class extends Base {};
  for (const method of resolverMethods) {
    if (typeof Base.prototype[method] !== "function") continue;
    Guarded.prototype[method] = function (...args) {
      try {
        const result = Base.prototype[method].apply(this, args);
        if (method === "readKeyframes") noteResolverRead(this);
        return result;
      } catch (error) {
        resolverOwners.get(this)?.fail(error);
        throw error;
      }
    };
  }
  resolverClasses.set(Base, Guarded);
  return Guarded;
}
const ElementResolver = guardedResolver(DOMKeyframesResolver);
class ElementAnimation {
  constructor(
    value,
    key,
    frames,
    options,
    element,
    bind,
    owned,
    externalComplete,
    Resolver,
  ) {
    this.externalComplete = externalComplete;
    this.customResolver = !!Resolver && Resolver !== DOMKeyframesResolver;
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
    const Resolve = Resolver ? guardedResolver(Resolver) : ElementResolver;
    this.resolver = new Resolve(
      frames,
      (resolved, final) => {
        if (!this.ready) {
          this.earlyResolution = [resolved, final];
          return;
        }
        untrackResolver(this.resolver);
        this.start(resolved, final);
      },
      key,
      value,
      element,
    );
    resolverOwners.set(this.resolver, this);
    trackResolver(this.resolver, (error) => this.fail(error));
    if (this.customResolver)
      for (const method of resolverMethods) {
        if (
          !Object.hasOwn(this.resolver, method) ||
          typeof this.resolver[method] !== "function"
        )
          continue;
        const original = this.resolver[method];
        this.resolver[method] = (...args) => {
          try {
            const result = original.apply(this.resolver, args);
            if (method === "readKeyframes") noteResolverRead(this.resolver);
            return result;
          } catch (error) {
            this.fail(error);
            throw error;
          }
        };
      }
    // Foreign public resolvers can measure by changing renderer-owned values.
    // Supply the render boundary and restoration when they have no transaction
    // hooks; VPM DOM resolvers keep their own grouped DOM transaction.
    if (
      this.customResolver &&
      typeof this.resolver.prepareMeasurement !== "function"
    ) {
      const r = this.resolver,
        renderEnd = r.renderEndStyles?.bind(r);
      let saved;
      r.prepareMeasurement = () => {
        const node = r.element?.current,
          view = node?.ownerDocument?.defaultView;
        saved = {
          value: this.value.get(),
          node,
          css: node?.style?.cssText,
          view,
          x: view?.scrollX,
          y: view?.scrollY,
        };
      };
      r.renderEndStyles = () => {
        renderEnd?.();
        r.element?.render?.();
      };
      const restore = r.restore?.bind(r);
      r.restore = () => {
        try {
          restore?.();
          if (saved) this.value.set(saved.value);
        } finally {
          if (saved?.css !== undefined) saved.node.style.cssText = saved.css;
          if (
            saved?.view?.scrollTo &&
            (saved.x !== saved.view.scrollX || saved.y !== saved.view.scrollY)
          )
            saved.view.scrollTo(saved.x, saved.y);
          saved = undefined;
        }
      };
    }
    this.stop = () => {
      if (this.stopped) return;
      this.stopped = true;
      this.resolver.cancel();
      untrackResolver(this.resolver);
      try {
        this.animation?.stop();
      } finally {
        if (!this.animation) this.resolveReady();
      }
    };
  }
  schedule() {
    this.ready = true;
    try {
      if (this.earlyResolution) {
        const [frames, final] = this.earlyResolution;
        this.earlyResolution = undefined;
        this.start(frames, final);
      } else this.resolver.scheduleResolve();
      trackResolver(this.resolver);
    } catch (error) {
      this.fail(error);
      throw error;
    }
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
    untrackResolver(this.resolver);
    try {
      this.resolver.cancel();
    } catch {}
    if (requests.get(this.value) === this) {
      if (this.previous?.animation) requests.set(this.value, this.previous);
      else requests.delete(this.value);
    }
    this.previous = undefined;
    this.waitState.failed = true;
    this.waitState.error = error;
    this.waitState.reject?.(error);
    failAnimation(this.value, this, error);
  }
  start(frames, final) {
    if (this.stopped || this.cancelled || !this.owned()) return;
    try {
      if (!Array.isArray(frames) || !frames.length)
        throw new TypeError("resolver must return a nonempty array");
      if (this.customResolver) frames = frames.slice();
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
      let complete = this.externalComplete;
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
      this.withLifecycle = !this.externalComplete;
      if (!this.externalComplete) {
        this.lifecycle = this.value.start((done) => {
          complete = done;
          return this;
        });
        this.lifecycle.catch(() => {});
      }
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
    if (this.failed || !this.animation) return this.waitingPromise();
    if (this.completionState !== this.animation.completion) {
      this.completionState = this.animation.completion;
      this.withLifecycle = !this.externalComplete && !this.lifecycleCompleted;
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
      resetResolverRead(this.resolver);
      try {
        this.resolver.resume();
        trackResolver(this.resolver);
      } catch (error) {
        this.fail(error);
        throw error;
      }
    }
  }
  cancel() {
    if (this.stopped) return;
    this.completed = false;
    if (this.animation) this.animation.cancel();
    else {
      this.cancelled = true;
      this.resolver.cancel();
      untrackResolver(this.resolver);
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
    const frames = prepareFrames(keyframes[key], !!element?.KeyframeResolver);
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
        undefined,
        element?.KeyframeResolver,
      );
      const previous = requests.get(value);
      if (previous && !previous.animation) previous.stop();
      handle.previous = previous?.animation ? previous : undefined;
      requests.set(value, handle);
      registry.set(key, handle);
      handles.push(handle);
    }
    for (const h of handles) h.schedule();
  } catch (error) {
    for (const h of handles) h.stop();
    throw error;
  }
  return handles;
}
function animateElement(element, keyframes, transition = {}, visualElement) {
  if (element?.nodeType !== 1 || !element.style)
    throw new TypeError("animateElement requires one HTML or SVG element");
  if (visualElement !== undefined) {
    validateRenderer(element, visualElement);
    object(transition, "transition");
    const reader = rendererReader(element, visualElement);
    const options = { ...transition };
    if (visualElement.shouldSkipAnimations) options.skipAnimations = true;
    if (visualElement.shouldReduceMotion) options.reduceMotion = true;
    return plan(
      (key) => {
        let value = visualElement.getValue(key);
        if (!value) {
          value = motionValue(undefined, { owner: visualElement });
          visualElement.addValue(key, value);
        }
        return value;
      },
      keyframes,
      options,
      reader,
      () => {},
      new Map(),
    );
  }
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
function validateRenderer(element, renderer) {
  if (element?.nodeType !== 1 || !element.style)
    throw new TypeError("handoff requires one HTML or SVG element");
  if (!renderer || renderer.current !== element)
    throw new TypeError("renderer must own the supplied element");
  for (const name of ["getValue", "addValue", "removeValue"])
    if (typeof renderer[name] !== "function")
      throw new TypeError("renderer requires " + name + "()");
}
function rendererReader(element, renderer) {
  return {
    current: element,
    KeyframeResolver: renderer.KeyframeResolver,
    render: renderer.render?.bind(renderer),
    getValue: renderer.getValue.bind(renderer),
    measureViewportBox: renderer.measureViewportBox?.bind(renderer),
    readValue: (key, target) =>
      renderer.readValue
        ? renderer.readValue(key, target)
        : element.namespaceURI === "http://www.w3.org/2000/svg"
          ? readSVGValue(element, key)
          : readStyleValue(element, key),
  };
}
function handOffElementState(element, renderer) {
  validateRenderer(element, renderer);
  const states = [styleEffect.state(element), svgEffect.state(element)],
    bindings = [],
    values = new Map(),
    handles = [],
    registry = owners.get(element);
  // Capture identities before invoking the destination. Reentrant additions are
  // separate work and must not be removed by cleanup of this transfer.
  for (const state of states)
    if (state)
      for (const [key, binding] of state.bindings) {
        bindings.push({ state, key, binding });
        values.set(key, binding.value);
      }
  if (registry)
    for (const [key, handle] of registry) {
      if (
        !handle.stopped &&
        !handle.failed &&
        requests.get(handle.value) === handle
      ) {
        handles.push({ key, handle });
        values.set(key, handle.value);
      }
    }
  const changes = [];
  try {
    for (const [key, value] of values) {
      const previous = renderer.getValue(key),
        owner = value.owner;
      changes.push({ key, value, previous, owner });
      value.owner = renderer;
      renderer.addValue(key, value);
    }
  } catch (error) {
    // The source renderer stays attached until every destination value accepts.
    // Restore destination entries even when addValue throws after attaching.
    for (let i = changes.length - 1; i >= 0; i--) {
      const { key, value, previous, owner } = changes[i];
      value.owner = owner;
      try {
        if (renderer.getValue(key) === value) {
          if (previous) renderer.addValue(key, previous);
          else renderer.removeValue(key);
        }
      } catch {
        /* Preserve the original destination error. */
      }
    }
    throw error;
  }
  const reader = rendererReader(element, renderer);
  for (const { key, handle } of handles) {
    handle.bind = () => {};
    handle.resolver.element = reader;
    if (registry.get(key) === handle) registry.delete(key);
  }
  for (const { state, key, binding } of bindings) {
    binding.off();
    state.retained?.delete(key);
    if (state.transformKeys)
      state.transformKeys = state.transformKeys.filter(
        (slot) => slot.binding !== binding,
      );
  }
  if (registry && !registry.size && owners.get(element) === registry)
    owners.delete(element);
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
module.exports = {
  animateElement,
  animateValues,
  releaseElement,
  handOffElementState,
};

function prepareRendererMotionValue(
  name,
  value,
  target,
  transition = {},
  element,
  isHandoff = false,
) {
  if (typeof name !== "string" || unsafe.has(name))
    throw new TypeError("invalid animation property");
  if (
    !value ||
    typeof value.get !== "function" ||
    typeof value.set !== "function" ||
    typeof value.getVelocity !== "function"
  )
    throw new TypeError("expected a MotionValue");
  object(transition, "transition");
  if (element !== undefined) object(element, "element");
  if (typeof isHandoff !== "boolean")
    throw new TypeError("isHandoff must be boolean");
  const Resolver = isHandoff
    ? KeyframeResolver
    : element?.KeyframeResolver || DOMKeyframesResolver;
  guardedResolver(Resolver);
  const options = snapshot(getValueTransition(transition, name));
  if (options.delay == null && transition.delay !== undefined)
    options.delay = transition.delay;
  if (transition.elapsed !== undefined) options.elapsed = transition.elapsed;
  if (
    element?.shouldSkipAnimations ||
    (element?.shouldReduceMotion &&
      /^(?:x|y|z|scale.*|rotate.*|translate.*|skew.*|transformPerspective)$/.test(
        name,
      ))
  )
    options.type = false;
  const frames = prepareFrames(
    target,
    !!element?.KeyframeResolver && !isHandoff,
  );
  if (options.from !== undefined) {
    if (frames[0] === null || isHandoff) frames[0] = options.from;
    options.from = undefined;
  }
  return (complete) => {
    if (typeof complete !== "function")
      throw new TypeError("completion must be a function");
    let handle;
    handle = new ElementAnimation(
      value,
      name,
      frames.slice(),
      snapshot(options),
      element,
      () => {},
      () => requests.get(value) === handle,
      complete,
      Resolver,
    );
    const previous = requests.get(value);
    if (previous && !previous.animation) previous.stop();
    handle.previous = previous?.animation ? previous : undefined;
    requests.set(value, handle);
    try {
      handle.schedule();
    } catch (error) {
      handle.stop();
      throw error;
    }
    return handle;
  };
}
Object.defineProperty(module.exports, "prepareRendererMotionValue", {
  value: prepareRendererMotionValue,
});
