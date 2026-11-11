"use strict";
const { resolveElements, propEffect } = require("./effects.cjs");
const { animateElement, prepareFrames, snapshotTransition } = require("./element.cjs");
const { animateSingleValue } = require("./single.cjs");
const { findEffect, addEffect, removeEffect, animateEffectSubject } = require("./custom-effects.cjs");
const { isMotionValue } = require("./value.cjs");
const { GroupAnimationWithThen } = require("./group.cjs");
const blocked = new Set(["__proto__", "constructor", "prototype", "transition", "transitionEnd"]);
function record(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TypeError(name + " must be an object");
}
function transitionSnapshot(options, keys) {
  const result = snapshotTransition(options);
  for (const key of ["default", ...keys])
    if (options[key] !== undefined) result[key] = snapshotTransition(options[key]);
  return result;
}
function animateElements(subject, keyframes, options = {}, scope) {
  record(keyframes, "keyframes");
  record(options, "options");
  const elements = resolveElements(subject, scope);
  for (const element of elements)
    if (element?.nodeType !== 1 || !element.style)
      throw new TypeError("selector animations require HTML or SVG elements");
  const frames = Object.create(null), keys = Object.keys(keyframes);
  for (const key of keys) {
    if (blocked.has(key)) throw new TypeError("unsupported animation property: " + key);
    if (keyframes[key] !== undefined) frames[key] = prepareFrames(keyframes[key]);
  }
  const captured = transitionSnapshot(options, keys);
  // Resolve every dynamic delay before starting any animation. Callbacks can
  // mutate the document or caller's input without changing this invocation.
  const transitions = elements.map((element, index) => {
    const result = transitionSnapshot(captured, keys);
    if (result.reduceMotion === undefined)
      result.reduceMotion = element.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (typeof captured.delay === "function") result.delay = captured.delay(index, elements.length);
    if (result.delay !== undefined && !Number.isFinite(result.delay))
      throw new RangeError("delay must be finite");
    return result;
  });
  const animations = [];
  try {
    for (let i = 0; i < elements.length; i++)
      animations.push(...animateElement(elements[i], frames, transitions[i]));
  } catch (error) {
    // A failed later element must not leave earlier elements running.
    for (const animation of animations) try { animation.stop(); } catch {}
    throw error;
  }
  return animations;
}
function animateSubjects(subject, keyframes, options, scope) {
  // DOM selectors keep their renderer. Custom effects take priority over
  // property animation, which is the fallback for ordinary objects.
  if (subject == null || typeof subject === "string" || subject.nodeType === 1)
    return animateElements(subject, keyframes, options, scope);
  const subjects = Array.isArray(subject) ? subject.slice()
    : typeof subject?.[Symbol.iterator] === "function"
      ? Array.from(subject) : [subject];
  if (subjects.every(item => item?.nodeType === 1))
    return animateElements(subjects, keyframes, options, scope);
  record(keyframes, "keyframes");
  const entries = subjects.map(item => {
    const dom = item?.nodeType === 1;
    const effect = dom ? undefined : (findEffect(item) || (propEffect.test(item) && !Array.isArray(item) ? propEffect : undefined));
    if (!dom && !effect) throw new TypeError("subject requires an object, DOM element or registered effect");
    return { item, effect };
  });
  const keys = Object.keys(keyframes), frames = Object.create(null);
  for (const key of keys) {
    if (blocked.has(key)) throw new TypeError("unsupported animation property: " + key);
    if (keyframes[key] !== undefined) frames[key] = prepareFrames(keyframes[key]);
  }
  const captured = transitionSnapshot(options, keys);
  const transitions = entries.map(({ item }, index) => {
    const result = transitionSnapshot(captured, keys);
    if (result.reduceMotion === undefined && item?.nodeType === 1)
      result.reduceMotion = item.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (typeof captured.delay === "function") result.delay = captured.delay(index, entries.length);
    if (result.delay !== undefined && !Number.isFinite(result.delay)) throw new RangeError("delay must be finite");
    return result;
  });
  const animations = [];
  try {
    entries.forEach(({ item, effect }, index) => animations.push(...(effect
      ? animateEffectSubject(effect, item, frames, transitions[index])
      : animateElement(item, frames, transitions[index]))));
  } catch (error) {
    for (const animation of animations) try { animation.stop(); } catch {}
    throw error;
  }
  return animations;
}
function createScopedAnimate(options = {}) {
  record(options, "scoped animation options");
  const { scope, reduceMotion, skipAnimations } = options;
  if (scope !== undefined) {
    record(scope, "scope");
    if (!Array.isArray(scope.animations)) throw new TypeError("scope.animations must be an array");
  }
  return (subject, keyframes, transition = {}) => {
    record(transition, "transition");
    const settings = { ...transition };
    if (skipAnimations || scope?.skipAnimations) settings.skipAnimations = true;
    if (settings.reduceMotion === undefined)
      settings.reduceMotion = scope?.reduceMotion ?? reduceMotion;
    const scalar = typeof subject === "number" || isMotionValue(subject) ||
      (typeof subject === "string" && (typeof keyframes === "string" || typeof keyframes === "number" || Array.isArray(keyframes)));
    if (scalar && settings.skipAnimations) settings.type = false;
    const animations = scalar
      ? [animateSingleValue(subject, keyframes, settings)]
      : animateSubjects(subject, keyframes, settings, scope);
    const group = new GroupAnimationWithThen(animations);
    if (scope) {
      try { scope.animations.push(group); }
      catch (error) { try { group.stop(); } catch {} throw error; }
    }
    return group;
  };
}
const animate = createScopedAnimate();
animate.addEffect = addEffect;
animate.removeEffect = removeEffect;
module.exports = { animate, createScopedAnimate, animateElements };
