"use strict";

const noop = (value) => value;
const clamp = (min, max, value) =>
  value > max ? max : value < min ? min : value;
const progress = (from, to, value) =>
  from === to ? 1 : (value - from) / (to - from);
const wrap = (min, max, value) => {
  const width = max - min;
  return min + ((((value - min) % width) + width) % width);
};
const secondsToMilliseconds = (seconds) => seconds * 1000;
const millisecondsToSeconds = (ms) => ms / 1000;
const velocityPerSecond = (velocity, duration) =>
  duration ? (velocity * 1000) / duration : 0;
const isObject = (value) => value !== null && typeof value === "object";
const isNumericalString = (value) =>
  !/\s/.test(value) && /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value);
const isZeroValueString = (value) =>
  /^0[^.\s]+$/.test(value) && !/\s/.test(value);
function addUniqueItem(array, item) {
  if (array.indexOf(item) < 0) array.push(item);
}
function removeItem(array, item) {
  const at = array.indexOf(item);
  if (at >= 0) array.splice(at, 1);
}
function moveItem(array, from, to) {
  const result = Array.from(array);
  let at = from < 0 ? result.length + from : from;
  if (at < 0 || at >= result.length) return result;
  const [item] = result.splice(at, 1);
  result.splice(to < 0 ? array.length + to : to, 0, item);
  return result;
}
function memo(callback) {
  let ready = false,
    value;
  return () => {
    if (!ready) {
      value = callback();
      ready = true;
    }
    return value;
  };
}
function pipe(...functions) {
  if (!functions.length)
    throw new TypeError("pipe requires at least one transform");
  const [a, b, c, d] = functions;
  switch (functions.length) {
    case 1:
      return a;
    case 2:
      return (value) => b(a(value));
    case 3:
      return (value) => c(b(a(value)));
    case 4:
      return (value) => d(c(b(a(value))));
    default:
      return (value) => {
        for (let i = 0; i < functions.length; i++) {
          const transform = functions[i];
          value = transform(value);
        }
        return value;
      };
  }
}
const MotionGlobalConfig = {};

// Notifications capture the current array and length. Removing during a
// notification leaves a tombstone until the outermost dispatch finishes, so
// unrelated callbacks keep their positions. Registration IDs make old
// disposers harmless after removal/re-addition without retaining the list.
class SubscriptionManager {
  constructor() {
    this.handlers = [];
    this.ids = [];
    this.sequence = 0;
    this.size = 0;
    this.depth = 0;
    this.dirty = false;
  }
  add(handler) {
    if (this.dirty && !this.depth) this.compact();
    let index = this.handlers.indexOf(handler);
    if (index < 0) {
      index = this.handlers.length;
      this.handlers.push(handler);
      this.ids.push(++this.sequence);
      this.size++;
    }
    const id = this.ids[index];
    return () => {
      const position = this.handlers.indexOf(handler);
      if (position >= 0 && this.ids[position] === id) this.remove(handler);
    };
  }
  remove(handler) {
    const index = this.handlers.indexOf(handler);
    if (index < 0) return;
    this.size--;
    this.handlers[index] = undefined;
    this.ids[index] = 0;
    this.dirty = true;
    if (!this.size && !this.depth) {
      this.handlers.length = 0;
      this.ids.length = 0;
      this.dirty = false;
    }
  }
  compact() {
    let to = 0;
    for (let from = 0; from < this.handlers.length; from++)
      if (this.handlers[from]) {
        this.handlers[to] = this.handlers[from];
        this.ids[to++] = this.ids[from];
      }
    this.handlers.length = this.ids.length = to;
    this.dirty = false;
  }
  notify(a, b, c) {
    const handlers = this.handlers,
      length = handlers.length;
    if (length === 1) {
      const fn = handlers[0];
      if (fn) fn(a, b, c);
      return;
    }
    if (!length) return;
    this.depth++;
    try {
      for (let i = 0; i < length; i++) {
        const fn = handlers[i];
        if (fn) fn(a, b, c);
      }
    } finally {
      this.depth--;
      if (!this.depth && this.dirty) this.compact();
    }
  }
  getSize() {
    return this.size;
  }
  clear() {
    this.handlers.length = 0;
    this.handlers = [];
    this.ids = [];
    this.size = 0;
    this.dirty = false;
  }
}

// Solve x(t)=input using safeguarded Newton steps. Bisection stays available
// for flat slopes; evaluation uses the polynomial, not a sampled lookup table.
function cubicBezier(x1, y1, x2, y2) {
  if (
    !Number.isFinite(x1) ||
    !Number.isFinite(y1) ||
    !Number.isFinite(x2) ||
    !Number.isFinite(y2) ||
    x1 < 0 ||
    x1 > 1 ||
    x2 < 0 ||
    x2 > 1
  )
    throw new TypeError(
      "Bezier controls require finite values and x in [0, 1]",
    );
  if (x1 === y1 && x2 === y2) return noop;
  const ax = 1 + 3 * x1 - 3 * x2,
    bx = 3 * x2 - 6 * x1,
    cx = 3 * x1,
    ay = 1 + 3 * y1 - 3 * y2,
    by = 3 * y2 - 6 * y1,
    cy = 3 * y1;
  return (input) => {
    if (input <= 0) return 0;
    if (input >= 1) return 1;
    if (Number.isNaN(input)) return NaN;
    let t = input,
      lo = 0,
      hi = 1;
    if (x1 === 0 && x2 === 0) t = Math.cbrt(input);
    else if (x1 === 1 && x2 === 1) t = 1 - Math.cbrt(1 - input);
    for (let i = 0; i < 40; i++) {
      const error = ((ax * t + bx) * t + cx) * t - input;
      const derivative = (3 * ax * t + 2 * bx) * t + cx;
      if (error === 0 || Math.abs(error / derivative) < 1e-11) break;
      if (error < 0) lo = t;
      else hi = t;
      const candidate = t - error / derivative;
      t = candidate > lo && candidate < hi ? candidate : (lo + hi) / 2;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}
const reverseEasing = (ease) => (value) => 1 - ease(1 - value);
const mirrorEasing = (ease) => (value) =>
  value <= 0.5 ? ease(value * 2) / 2 : 1 - ease((1 - value) * 2) / 2;
const easeIn = cubicBezier(0.42, 0, 1, 1),
  easeOut = cubicBezier(0, 0, 0.58, 1),
  easeInOut = cubicBezier(0.42, 0, 0.58, 1);
const backOut = cubicBezier(0.33, 1.53, 0.69, 0.99),
  backIn = reverseEasing(backOut),
  backInOut = mirrorEasing(backIn);
const circIn = (value) => 1 - Math.sqrt(1 - value * value),
  circOut = reverseEasing(circIn),
  circInOut = mirrorEasing(circIn);
const anticipate = (value) =>
  value === 1
    ? 1
    : value < 0.5
      ? backIn(value * 2) / 2
      : 1 - Math.pow(2, -20 * value + 10) / 2;
function steps(count, direction = "end") {
  if (!Number.isSafeInteger(count) || count <= 0)
    throw new TypeError("steps requires a positive integer");
  if (direction !== "start" && direction !== "end")
    throw new TypeError("step direction must be start or end");
  const round = direction === "start" ? Math.ceil : Math.floor;
  return (value) =>
    round(
      clamp(
        direction === "start" ? 0.001 : 0,
        direction === "end" ? 0.999 : 1,
        value,
      ) * count,
    ) / count;
}
const isBezierDefinition = (value) =>
  Array.isArray(value) && typeof value[0] === "number";
const isEasingArray = (value) =>
  Array.isArray(value) && !isBezierDefinition(value);
const getEasingForSegment = (easing, index) =>
  isEasingArray(easing) ? easing[index % easing.length] : easing;
const named = {
  linear: noop,
  easeIn,
  easeOut,
  easeInOut,
  backIn,
  backOut,
  backInOut,
  circIn,
  circOut,
  circInOut,
  anticipate,
};
function easingDefinitionToFunction(definition) {
  if (typeof definition === "function") return definition;
  if (isBezierDefinition(definition)) {
    if (definition.length !== 4)
      throw new TypeError("Bezier definitions require four numeric controls");
    return cubicBezier(...definition);
  }
  if (typeof definition === "string") {
    if (!Object.hasOwn(named, definition))
      throw new Error("Unknown easing: " + definition);
    return named[definition];
  }
  return definition;
}

const describe = (message, code) =>
  code
    ? message +
      ". For more information and steps for solving, visit https://motion.dev/troubleshooting/" +
      code
    : message;
const development = process.env.NODE_ENV !== "production";
function warning(check, message, code) {
  if (development && !check) console.warn(describe(message, code));
}
function invariant(check, message, code) {
  if (development && !check) throw new Error(describe(message, code));
}
const warned = new Set();
function warnOnce(check, message, code) {
  if (!check && !warned.has(message)) {
    warned.add(message);
    console.warn(describe(message, code));
  }
}
const hasWarned = (message) => warned.has(message);
module.exports = {
  MotionGlobalConfig,
  SubscriptionManager,
  addUniqueItem,
  anticipate,
  backIn,
  backInOut,
  backOut,
  circIn,
  circInOut,
  circOut,
  clamp,
  cubicBezier,
  easeIn,
  easeInOut,
  easeOut,
  easingDefinitionToFunction,
  getEasingForSegment,
  hasWarned,
  invariant,
  isBezierDefinition,
  isEasingArray,
  isNumericalString,
  isObject,
  isZeroValueString,
  memo,
  millisecondsToSeconds,
  mirrorEasing,
  moveItem,
  noop,
  pipe,
  progress,
  removeItem,
  reverseEasing,
  secondsToMilliseconds,
  steps,
  velocityPerSecond,
  warnOnce,
  warning,
  wrap,
};
