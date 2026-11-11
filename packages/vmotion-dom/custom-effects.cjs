"use strict";
const { frame, frameSteps, cancelFrame } = require("./frame.cjs");
const { KeyframeResolver } = require("./resolver.cjs");
const { motionValue } = require("./value.cjs");
const { animateValues, prepareFrames, snapshotTransition, getAnimationRequest, observeCompletion } = require("./element.cjs");
const unsafe = new Set(["__proto__", "prototype", "constructor"]);
const object = value => value !== null && (typeof value === "object" || typeof value === "function");
function keyCheck(key) {
  if (typeof key !== "string" || unsafe.has(key)) throw new TypeError("unsafe effect property");
}
function valueCheck(value) {
  if (!value || typeof value.get !== "function" || typeof value.on !== "function")
    throw new TypeError("effects require MotionValue bindings");
}
function all(items, fn) {
  let failure;
  for (const item of items) try { fn(item); } catch (error) { failure ??= { error }; }
  if (failure) throw failure.error;
}
let captureState, restoreState;
class MotionValueState {
  #bindings = new Map();
  #pending = [];
  #spare;
  #queued = 0;
  #cancel;
  #step;
  #job;
  #ticket = 0;
  static {
    captureState = state => new Map(state.#bindings);
    restoreState = (state, before) => {
      for (const [key, binding] of state.#bindings)
        if (before.get(key) !== binding) try { binding.off(); } catch {}
      for (const [key, binding] of before)
        if (state.#bindings.get(key) !== binding)
          try { state.#restore(binding); } catch {}
    };
  }
  constructor(step = frame.render) {
    if (typeof step !== "function") throw new TypeError("effect step must be a scheduler");
    this.#step = step;
    const phase = Object.keys(frame).find(key => frame[key] === step);
    this.#cancel = phase ? job => frameSteps[phase].cancel(job) : cancelFrame;
    this.flush = () => {
      const batch = this.#pending;
      this.#pending = this.#spare || [];
      this.#spare = undefined;
      this.#queued = 0;
      // Clear queued markers before callbacks so reentrant writes belong to
      // the new batch, including writes to a binding later in this batch.
      for (const binding of batch) binding.queued = false;
      this.#ticket++;
      if (this.#job) this.#cancel(this.#job);
      this.#job = undefined;
      const rendered = [];
      let failure;
      for (let binding of batch) {
        try {
          if (this.#bindings.get(binding.key) !== binding) continue;
          let seen;
          while (binding && this.#bindings.get(binding.key) === binding) {
            if (binding.render) {
              if (!rendered.includes(binding.render)) {
                rendered.push(binding.render);
                binding.render();
              }
              break;
            }
            if (!binding.computed) break;
            seen ||= [];
            if (seen.includes(binding)) break;
            seen.push(binding);
            let parent;
            for (const candidate of this.#bindings.values())
              if (candidate.value === binding.computed) { parent = candidate; break; }
            binding = parent;
          }
        } catch (error) { failure ??= { error }; }
      }
      batch.length = 0;
      this.#spare = batch;
      if (failure) throw failure.error;
    };
  }
  #queue(binding) {
    if (this.#bindings.get(binding.key) !== binding) return;
    if (!binding.queued) { binding.queued = true; this.#queued++; this.#pending.push(binding); }
    if (this.#job) return;
    const ticket = ++this.#ticket;
    this.#job = () => { if (ticket === this.#ticket) this.flush(); };
    try { this.#step(this.#job); }
    catch (error) { this.#job = undefined; this.#ticket++; throw error; }
  }
  #restore(binding) {
    const unsubscribe = binding.value.on("change", () => this.#queue(binding));
    if (typeof unsubscribe !== "function") throw new TypeError("subscription must return cleanup");
    binding.unsubscribe = unsubscribe;
    binding.active = true;
    this.#bindings.set(binding.key, binding);
    this.#queue(binding);
  }
  set(key, value, render, computed) {
    keyCheck(key); valueCheck(value);
    if (render !== undefined && typeof render !== "function") throw new TypeError("render must be a function");
    if (computed !== undefined) valueCheck(computed);
    const binding = { key, value, render, computed, queued: false, active: true, unsubscribe: undefined, off: undefined };
    const unsubscribe = value.on("change", () => this.#queue(binding));
    if (typeof unsubscribe !== "function") throw new TypeError("subscription must return cleanup");
    const previous = this.#bindings.get(key);
    try { previous?.off(); }
    catch (error) { try { unsubscribe(); } catch {} throw error; }
    this.#bindings.set(key, binding);
    binding.active = true;
    binding.unsubscribe = unsubscribe;
    binding.off = () => {
      if (!binding.active) return;
      binding.active = false;
      if (this.#bindings.get(key) === binding) this.#bindings.delete(key);
      if (binding.queued) { binding.queued = false; this.#queued--; }
      if (!this.#queued) {
        this.#pending.length = 0;
        if (this.#job) { this.#cancel(this.#job); this.#job = undefined; this.#ticket++; }
      }
      binding.unsubscribe();
    };
    try { this.#queue(binding); }
    catch (error) {
      try { binding.off(); } catch {}
      if (previous) try { this.#restore(previous); } catch {}
      throw error;
    }
    return binding.off;
  }
  get(key) { return this.#bindings.get(key)?.value; }
  release() {
    const entries = [...this.#bindings.values()];
    const values = new Map(entries.map(entry => [entry.key, entry.value]));
    all(entries, entry => entry.off());
    return values;
  }
}
function createEffect(addValue, options = {}) {
  if (typeof addValue !== "function") throw new TypeError("addValue must be a function");
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("effect options must be an object");
  for (const key of ["test", "read", "step"])
    if (options[key] !== undefined && typeof options[key] !== "function") throw new TypeError(key + " must be a function");
  const states = new WeakMap(), step = options.step;
  function effect(subject, values) {
    if (!object(subject) || !values || typeof values !== "object" || Array.isArray(values)) throw new TypeError("invalid effect subject or values");
    const entries = Object.entries(values);
    for (const [key, value] of entries) { keyCheck(key); valueCheck(value); }
    let state = states.get(subject);
    if (!state) { state = new MotionValueState(step); states.set(subject, state); }
    const before = captureState(state), cleanups = [];
    try {
      for (const [key, value] of entries) {
        const cleanup = addValue(subject, state, key, value);
        if (typeof cleanup !== "function") throw new TypeError("addValue must return cleanup");
        cleanups.push(cleanup);
      }
    } catch (error) {
      try { all(cleanups, cleanup => cleanup()); } catch {}
      restoreState(state, before);
      throw error;
    }
    let active = true;
    return () => { if (!active) return; active = false; all(cleanups, cleanup => cleanup()); };
  }
  effect.get = (subject, key) => states.get(subject)?.get(key);
  effect.state = subject => states.get(subject);
  effect.flush = subject => states.get(subject)?.flush();
  effect.test = options.test;
  effect.read = options.read;
  effect.step = step;
  return effect;
}
const registered = [];
function checkEffect(effect) {
  if (typeof effect !== "function") throw new TypeError("effect must be a function");
  for (const key of ["test", "read", "get", "flush", "state"])
    if (typeof effect[key] !== "function") throw new TypeError("effect requires " + key + "()");
}
function addEffect(effect) {
  checkEffect(effect);
  removeEffect(effect);
  registered.unshift(effect);
}
function removeEffect(effect) {
  const index = registered.indexOf(effect);
  if (index !== -1) registered.splice(index, 1);
}
function findEffect(subject) {
  for (const effect of registered.slice()) if (effect.test(subject)) return effect;
}
const endGenerations = new WeakMap();
function snapshotEffectEnd(end) {
  if (end === undefined) return undefined;
  if (!end || typeof end !== "object" || Array.isArray(end)) throw new TypeError("transitionEnd must be an object");
  const result = Object.create(null);
  for (const key of Object.keys(end)) {
    keyCheck(key);
    const value = end[key];
    if (value === undefined) continue;
    if (typeof value !== "string" && !Number.isFinite(value)) throw new TypeError("transitionEnd requires strings or finite numbers");
    result[key] = value;
  }
  return result;
}
function animateEffectSubject(effect, subject, keyframes, transition = {}, element) {
  checkEffect(effect);
  if (!object(subject)) throw new TypeError("effect subject must be an object");
  if (!keyframes || typeof keyframes !== "object" || Array.isArray(keyframes)) throw new TypeError("keyframes must be an object");
  const end = snapshotEffectEnd(keyframes.transitionEnd);
  const frames = Object.create(null), settings = snapshotTransition(keyframes.transition ?? transition), created = Object.create(null), values = new Map();
  for (const key of Object.keys(keyframes)) {
    if (key === "transition" || key === "transitionEnd" || keyframes[key] === undefined) continue;
    keyCheck(key);
    frames[key] = prepareFrames(keyframes[key], !!element?.KeyframeResolver);
    if (settings[key] !== undefined) settings[key] = snapshotTransition(settings[key]);
  }
  if (settings.default !== undefined) settings.default = snapshotTransition(settings.default);
  for (const key of Object.keys(frames)) {
    let value = effect.get(subject, key);
    if (!value) {
      const source = frames[key], initial = element ? undefined : source[0] ?? effect.read(subject, key, Array.isArray(keyframes[key]) ? source.slice() : keyframes[key]);
      if (!element && (initial === undefined || initial === null)) throw new TypeError(key + " cannot be read; provide explicit [from, to] keyframes");
      value = motionValue(initial);
      created[key] = value;
    }
    values.set(key, value);
  }
  const endings = end && Object.entries(end).map(([key, value]) => ({
    key, value, slot: values.get(key) || effect.get(subject, key), request: undefined,
  }));
  // Only subjects with completion values need generation bookkeeping. A later
  // ordinary animation still supersedes earlier ends on overlapping keys.
  let subjects = endGenerations.get(effect), keys = subjects?.get(subject);
  if (end && Object.keys(end).length && !keys) {
    if (!subjects) endGenerations.set(effect, subjects = new WeakMap());
    subjects.set(subject, keys = new Map());
  }
  const names = keys ? new Set([...Object.keys(frames), ...Object.keys(end || {})]) : undefined;
  const token = keys ? {} : undefined, previous = keys ? new Map() : undefined;
  if (keys) for (const key of names) { previous.set(key, keys.get(key)); keys.set(key, token); }
  let detach, handles;
  try {
    if (Object.keys(created).length) {
      detach = effect(subject, created);
      if (typeof detach !== "function") throw new TypeError("effect must return cleanup");
    }
    handles = animateValues(key => values.get(key), frames, settings, element || { current: subject, KeyframeResolver });
  } catch (error) {
    try { detach?.(); } catch {}
    for (const [key, prior] of previous || []) if (keys.get(key) === token) {
      if (prior === undefined) keys.delete(key); else keys.set(key, prior);
    }
    throw error;
  }
  if (endings?.length) {
    for (const item of endings) item.request = item.slot && getAnimationRequest(item.slot);
    const current = () => [...names].every(key => keys.get(key) === token) &&
      handles.every(h => h.completed && !h.stopped && !h.cancelled && !h.failed && !h.run?.failed && h.owned()) &&
      [...values].every(([key, value]) => effect.get(subject, key) === value) &&
      endings.every(item => effect.get(subject, item.key) === item.slot && (!item.slot || getAnimationRequest(item.slot) === item.request));
    const schedule = () => queueMicrotask(() => frame.update(() => {
      if (!current()) return;
      for (const item of endings) {
        if (!current()) break;
        if (item.slot) item.slot.set(item.value);
        else {
          // End-only properties must not be bound to undefined during playback.
          // Bind only when the completion barrier still owns this subject.
          item.slot = motionValue(item.value);
          effect(subject, { [item.key]: item.slot });
        }
      }
    }));
    let remaining = handles.length;
    if (!remaining) schedule();
    else for (const handle of handles) observeCompletion(handle, () => { if (--remaining === 0) schedule(); });
  }
  return handles;
}
module.exports = { MotionValueState, createEffect, addEffect, removeEffect, findEffect, animateEffectSubject };

Object.defineProperty(module.exports, "snapshotEffectEnd", { value: snapshotEffectEnd });
