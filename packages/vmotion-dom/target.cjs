"use strict";
const {
    animateValues,
    getAnimationRequest,
    observeCompletion,
  } = require("./element.cjs"),
  { motionValue } = require("./value.cjs"),
  { frame } = require("./frame.cjs"),
  { readStyleValue, readSVGValue } = require("./reads.cjs");
const generations = new WeakMap(),
  unsafe = new Set(["__proto__", "prototype", "constructor"]);
function record(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TypeError(name + " must be an object");
}
function animateTarget(renderer, target, options = {}) {
  record(renderer, "renderer");
  record(target, "target");
  record(options, "options");
  if (
    typeof renderer.getValue !== "function" ||
    typeof renderer.addValue !== "function"
  )
    throw new TypeError("renderer requires getValue() and addValue()");
  if (options.type !== undefined)
    throw new TypeError("variant animation state is not implemented");
  if (options.delay !== undefined && !Number.isFinite(options.delay))
    throw new RangeError("delay must be finite");
  const end = [];
  if (target.transitionEnd !== undefined) {
    record(target.transitionEnd, "transitionEnd");
    for (const key of Object.keys(target.transitionEnd)) {
      if (unsafe.has(key)) throw new TypeError("unsafe animation property");
      const value = target.transitionEnd[key];
      if (value === undefined) continue;
      if (typeof value !== "string" && !Number.isFinite(value))
        throw new TypeError("transitionEnd requires strings or finite numbers");
      end.push([key, value]);
    }
  }
  const frames = {};
  for (const key of Object.keys(target)) {
    if (key === "transition" || key === "transitionEnd") continue;
    if (unsafe.has(key)) throw new TypeError("unsafe animation property");
    frames[key] = target[key];
  }
  const transition =
    options.transitionOverride ??
    target.transition ??
    renderer.getDefaultTransition?.() ??
    {};
  record(transition, "transition");
  const prepared = { ...transition };
  if (options.delay !== undefined && prepared.delay === undefined)
    prepared.delay = options.delay;
  if (renderer.shouldSkipAnimations) prepared.skipAnimations = true;
  if (renderer.shouldReduceMotion) prepared.reduceMotion = true;
  function getValue(key, endpoint) {
    let value = renderer.getValue(key);
    if (!value) {
      let initial = renderer.latestValues?.[key];
      if (initial === undefined && endpoint !== undefined) {
        initial = renderer.readValue?.(key, endpoint);
        const node = renderer.current;
        if (initial === undefined && node?.nodeType === 1 && node.style)
          initial =
            node.namespaceURI === "http://www.w3.org/2000/svg"
              ? readSVGValue(node, key)
              : readStyleValue(node, key);
      }
      value = motionValue(initial, { owner: renderer });
      renderer.addValue(key, value);
    }
    return value;
  }
  const values = end.map(([key, value]) => ({
    key,
    value,
    slot: getValue(key, value),
    request: undefined,
  }));
  let keys = generations.get(renderer);
  if (!keys) generations.set(renderer, (keys = new Map()));
  const token = {},
    names = new Set([
      ...Object.keys(frames).filter((key) => frames[key] !== undefined),
      ...end.map(([key]) => key),
    ]);
  const previous = new Map();
  for (const name of names) {
    previous.set(name, keys.get(name));
    keys.set(name, token);
  }
  let handles;
  try {
    handles = animateValues(getValue, frames, prepared, renderer);
  } catch (error) {
    for (const [name, prior] of previous)
      if (keys.get(name) === token) {
        if (prior === undefined) keys.delete(name);
        else keys.set(name, prior);
      }
    throw error;
  }
  if (end.length) {
    for (const item of values) item.request = getAnimationRequest(item.slot);
    const current = () =>
      [...names].every((name) => keys.get(name) === token) &&
      handles.every(
        (h) =>
          h.completed &&
          !h.stopped &&
          !h.cancelled &&
          !h.failed &&
          !h.run?.failed &&
          h.owned(),
      ) &&
      values.every(
        (item) =>
          getAnimationRequest(item.slot) === item.request &&
          renderer.getValue(item.key) === item.slot,
      );
    let remaining = handles.length;
    const scheduleEnd = () =>
      queueMicrotask(() =>
        frame.update(() => {
          if (!current()) return;
          for (const { value, slot } of values) {
            if (!current()) break;
            slot.set(value);
          }
        }),
      );
    if (!remaining) scheduleEnd();
    else {
      const completed = () => {
        if (--remaining === 0) scheduleEnd();
      };
      for (const handle of handles) observeCompletion(handle, completed);
    }
  }
  return handles;
}
module.exports = { animateTarget };
