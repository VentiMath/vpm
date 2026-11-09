"use strict";
const { spring } = require("./spring.cjs");
const { JSAnimation } = require("./playback.cjs");
const orchestration = new Set([
  "when",
  "delay",
  "delayChildren",
  "staggerChildren",
  "staggerDirection",
  "repeat",
  "repeatType",
  "repeatDelay",
  "from",
  "elapsed",
]);
const transforms = new Set([
  "x",
  "y",
  "z",
  "translateX",
  "translateY",
  "translateZ",
  "scale",
  "scaleX",
  "scaleY",
  "scaleZ",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skewX",
  "skewY",
  "transformPerspective",
]);
const easing = () => [0.25, 0.1, 0.35, 1];
function getDefaultTransition(name, { keyframes }) {
  if (keyframes.length > 2) return { type: "keyframes", duration: 0.8 };
  if (!transforms.has(name))
    return { type: "keyframes", ease: easing(), duration: 0.3 };
  if (name.startsWith("scale"))
    return {
      type: "spring",
      stiffness: 550,
      damping: keyframes.at(-1) === 0 ? 2 * Math.sqrt(550) : 30,
      restSpeed: 10,
    };
  return { type: "spring", stiffness: 500, damping: 25, restSpeed: 10 };
}
function getValueTransition(transition, key) {
  return transition[key] || transition.default || transition;
}
function isTransitionDefined(transition) {
  for (const key in transition)
    if (Object.hasOwn(transition, key) && !orchestration.has(key)) return true;
  return false;
}
function optionsObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TypeError("transition must be an options object");
}
function snapshot(options) {
  const result = { ...options };
  if (Array.isArray(result.times)) result.times = result.times.slice();
  if (Array.isArray(result.ease))
    result.ease = result.ease.map((x) => (Array.isArray(x) ? x.slice() : x));
  return result;
}
// Resolved numeric values need no DOM measurements or asynchronous resolver.
// Capture configuration now; resolve current value and velocity when started.
function animateMotionValue(
  name,
  value,
  target,
  transition = {},
  element,
  isHandoff,
) {
  if (element !== undefined || isHandoff)
    return require("./element.cjs").prepareRendererMotionValue(
      name,
      value,
      target,
      transition,
      element,
      isHandoff,
    );
  return prepareMotionValue(name, value, target, transition);
}
// Internal preparation mode pauses playback without changing transition defaults
// or copying user options just to add autoplay:false.
function prepareMotionValue(
  name,
  value,
  target,
  transition = {},
  paused = false,
  owned = false,
) {
  if (
    !value ||
    typeof value.get !== "function" ||
    typeof value.set !== "function" ||
    typeof value.getVelocity !== "function"
  )
    throw new TypeError("expected a MotionValue");
  optionsObject(transition);
  const selected = owned ? transition : getValueTransition(transition, name);
  optionsObject(selected);
  const options = owned ? selected : snapshot(selected);
  const delay = selected.delay ?? transition.delay ?? 0;
  const elapsed = transition.elapsed ?? 0;
  if (!Number.isFinite(delay) || !Number.isFinite(elapsed))
    throw new RangeError("delay and elapsed must be finite");
  options.delay = delay * 1000 - elapsed;
  for (const key of ["duration", "repeatDelay"]) {
    if (options[key] !== undefined) {
      if (!Number.isFinite(options[key]) || options[key] < 0)
        throw new RangeError(`${key} must be finite and nonnegative`);
      options[key] *= 1000;
    }
  }
  const frames = owned
    ? target
    : Array.isArray(target)
      ? target.slice()
      : [null, target];
  if (!frames.length || frames.some((x) => x !== null && !Number.isFinite(x)))
    throw new TypeError(
      "numeric targets must contain finite numbers or null wildcards",
    );
  if (options.from !== undefined && !Number.isFinite(options.from))
    throw new TypeError("from must be a finite number");
  for (const key of ["onUpdate", "onComplete"])
    if (options[key] !== undefined && typeof options[key] !== "function")
      throw new TypeError(`${key} must be a function`);
  // Element adapters already selected defaults before attaching their owned
  // callbacks; avoid scanning the same configuration and allocating an empty map.
  const defaults =
    owned || isTransitionDefined(selected)
      ? undefined
      : getDefaultTransition(name, { keyframes: frames });
  if (defaults?.duration !== undefined) defaults.duration *= 1000;
  if (!Object.hasOwn(options, "ease"))
    options.ease = defaults?.ease ?? "easeOut";
  if (defaults)
    for (const key of Object.keys(defaults))
      if (!Object.hasOwn(options, key)) options[key] = defaults[key];
  if (paused) options.autoplay = false;
  return (complete) => {
    if (typeof complete !== "function")
      throw new TypeError("completion must be a function");
    const resolved = owned ? frames : frames.slice();
    for (let i = 0; i < resolved.length; i++)
      if (resolved[i] === null)
        resolved[i] = i ? resolved[i - 1] : (options.from ?? value.get());
    const type = options.type ?? defaults?.type;
    if (resolved.length === 1 && (type === "spring" || type === spring))
      resolved.push(resolved[0]);
    // from only replaces an unresolved start, never an explicit first keyframe.
    const prepared = owned ? options : { ...options };
    const onUpdate = options.onUpdate,
      onComplete = options.onComplete;
    if (!Object.hasOwn(prepared, "velocity"))
      prepared.velocity = value.getVelocity();
    prepared.keyframes = resolved;
    prepared.onUpdate = (next) => {
      value.set(next);
      onUpdate?.(next);
    };
    prepared.onComplete = () => {
      complete();
      onComplete?.();
    };
    return new JSAnimation(prepared);
  };
}
module.exports = {
  animateMotionValue,
  getDefaultTransition,
  getValueTransition,
  isTransitionDefined,
};

Object.defineProperty(module.exports, "prepareMotionValue", {
  value: prepareMotionValue,
});
