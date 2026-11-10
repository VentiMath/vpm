"use strict";
const { easingDefinitionToFunction } = require("vmotion-utils");
const { mix } = require("./mix.cjs");
const mixNumber = (from, to, progress) => from + (to - from) * progress;

// Prepare and own the ranges once. Lookups never reread caller arrays, and
// binary search bounds the work when a timeline contains many keyframes.
function interpolate(input, output, { clamp = true, ease, mixer } = {}) {
  if (
    !Array.isArray(input) ||
    !Array.isArray(output) ||
    !input.length ||
    input.length !== output.length
  )
    throw new TypeError("interpolate requires nonempty, equally sized ranges");
  const keys = input.slice(),
    values = output.slice();
  for (const key of keys)
    if (!Number.isFinite(key))
      throw new TypeError("input keyframes must be finite numbers");
  const descending = keys[0] > keys.at(-1);
  if (descending) {
    keys.reverse();
    values.reverse();
  }
  for (let i = 1; i < keys.length; i++)
    if (keys[i] < keys[i - 1])
      throw new TypeError("input keyframes must be monotonic");
  if (mixer !== undefined && typeof mixer !== "function")
    throw new TypeError("mixer must be a function");
  if (!mixer) {
    let nonNumeric = false;
    for (const value of values) {
      if (typeof value === "number") {
        if (!Number.isFinite(value))
          throw new TypeError("output keyframes must be finite");
      } else if (value === undefined || value === null)
        throw new TypeError("invalid output keyframe");
      else nonNumeric = true;
    }
    if (nonNumeric) mixer = mix;
  }
  const easings = Array.isArray(ease) ? ease.slice() : undefined;
  if (
    easings
      ? !easings.every((e) => e === undefined || typeof e === "function")
      : ease !== undefined && typeof ease !== "function"
  )
    throw new TypeError(
      "interpolation easing must be a function or an array of functions",
    );
  if (keys.length === 1) return () => values[0];
  // Plain numeric timelines need no per-segment function allocations.
  const segments = mixer || ease ? [] : undefined;
  if (segments)
    for (let i = 0; i < keys.length - 1; i++) {
      const a = values[i],
        b = values[i + 1];
      const blend = mixer ? mixer(a, b) : (p) => mixNumber(a, b, p);
      if (typeof blend !== "function")
        throw new TypeError("mixer must return a function");
      const easing = easings ? easings[i] : ease;
      segments.push(easing ? (p) => blend(easing(p)) : blend);
    }
  const lower = keys[0],
    upper = keys.at(-1),
    last = keys.length - 2;
  if (last === 0) {
    const width = upper - lower,
      blend = segments
        ? segments[0]
        : (p) => mixNumber(values[0], values[1], p);
    return (value) => {
      const p =
        width === 0
          ? !clamp && value < lower
            ? 0
            : 1
          : (value - lower) / width;
      return blend(clamp ? Math.max(0, Math.min(1, p)) : p);
    };
  }
  return (value) => {
    if (clamp) value = Math.max(lower, Math.min(upper, value));
    let low = 0,
      high = last;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (value < keys[mid + 1]) high = mid;
      else low = mid + 1;
    }
    const width = keys[low + 1] - keys[low];
    const p =
      width === 0
        ? !descending && value < keys[low]
          ? 0
          : 1
        : (value - keys[low]) / width;
    return segments
      ? segments[low](p)
      : mixNumber(values[low], values[low + 1], p);
  };
}

// Delays for list animations. Grid and random origins belong to a later
// implementation stage and reject rather than silently behaving as a list.
function stagger(
  duration = 0.1,
  { startDelay = 0, from = "first", ease, grid } = {},
) {
  if (!Number.isFinite(duration) || !Number.isFinite(startDelay))
    throw new TypeError("stagger delays must be finite numbers");
  if (grid !== undefined)
    throw new TypeError("grid stagger is not implemented yet");
  if (
    !["first", "last", "center", "edges"].includes(from) &&
    !Number.isFinite(from)
  )
    throw new TypeError("unsupported stagger origin");
  const easing =
    ease === undefined ? undefined : easingDefinitionToFunction(ease);
  if (easing !== undefined && typeof easing !== "function")
    throw new TypeError("invalid stagger easing");
  return (index, total) => {
    if (
      !Number.isInteger(total) ||
      total < 1 ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= total
    )
      throw new RangeError(
        "stagger requires an index within a positive integer total",
      );
    const origin =
      from === "first"
        ? 0
        : from === "last"
          ? total - 1
          : from === "center"
            ? (total - 1) / 2
            : from;
    const distance =
      from === "edges"
        ? Math.min(index, total - 1 - index)
        : Math.abs(index - origin);
    return (
      startDelay +
      (easing
        ? easing(distance / total) * duration * total
        : duration * distance)
    );
  };
}
module.exports = { interpolate, mixNumber, stagger };
