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

// Delays share the same public list contract; grid delays use Euclidean cell
// distances. Random origins keep a permutation for the current collection size.
function stagger(
  duration = 0.1,
  { startDelay = 0, from = "first", ease, grid } = {},
) {
  if (!Number.isFinite(duration) || !Number.isFinite(startDelay))
    throw new TypeError("stagger delays must be finite numbers");
  if (
    grid !== undefined &&
    (!Array.isArray(grid) ||
      grid.length !== 2 ||
      [grid[0], grid[1]].some((n) => !Number.isSafeInteger(n) || n < 1))
  )
    throw new TypeError("grid must contain positive integer columns and rows");
  if (
    !["first", "last", "center", "edges", "random"].includes(from) &&
    !Number.isFinite(from)
  )
    throw new TypeError("unsupported stagger origin");
  const easing =
    ease === undefined ? undefined : easingDefinitionToFunction(ease);
  if (easing !== undefined && typeof easing !== "function")
    throw new TypeError("invalid stagger easing");
  if (from === "random")
    return randomStagger(duration, startDelay, easing, grid !== undefined);
  if (grid !== undefined)
    return gridStagger(duration, startDelay, from, easing, grid[0], grid[1]);
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
function gridStagger(
  duration,
  startDelay,
  from,
  easing,
  columns,
  declaredRows,
) {
  let previousTotal = 0,
    width,
    rows,
    ox,
    oy,
    maximum = 0,
    scale = 0,
    distances;
  const distance = (x, y) =>
    from === "edges"
      ? width === 1 && rows === 1
        ? 0
        : Math.min(
            width > 1 ? Math.min(x, width - 1 - x) : Infinity,
            rows > 1 ? Math.min(y, rows - 1 - y) : Infinity,
          )
      : Math.hypot(x - ox, y - oy);
  return (index, total) => {
    if (
      !Number.isSafeInteger(total) ||
      total < 1 ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= total
    )
      throw new RangeError(
        "stagger requires an index within a positive integer total",
      );
    if (previousTotal !== total) {
      previousTotal = total;
      // Reuse geometry for ordinary animation groups without caching user easing
      // results. Large groups stay constant-space instead of growing a cache.
      distances = total <= 4096 ? [] : null;
      width = Math.min(columns, total);
      rows = Math.max(declaredRows, Math.ceil(total / columns));
      if (typeof from === "number") {
        ox = from % columns;
        oy = Math.floor(from / columns);
      } else {
        ox =
          from === "last" ? width - 1 : from === "center" ? (width - 1) / 2 : 0;
        oy =
          from === "last" ? rows - 1 : from === "center" ? (rows - 1) / 2 : 0;
      }
      if (easing) {
        // A partial final row is a separate rectangle. Its extrema and the
        // complete rows determine the scale without allocating per-item arrays.
        const full = Math.floor(total / columns),
          remainder = total % columns;
        if (from === "edges") {
          const x = Math.floor((width - 1) / 2),
            y = Math.floor((rows - 1) / 2);
          maximum = Math.max(
            full ? distance(x, Math.min(y, full - 1)) : 0,
            remainder ? distance(Math.min(x, remainder - 1), full) : 0,
          );
        } else {
          maximum = Math.max(distance(0, 0), distance(width - 1, 0));
          if (full)
            maximum = Math.max(
              maximum,
              distance(0, full - 1),
              distance(columns - 1, full - 1),
            );
          if (remainder)
            maximum = Math.max(
              maximum,
              distance(0, full),
              distance(remainder - 1, full),
            );
        }
      }
      scale = duration * maximum;
    }
    // Cache geometry and its normalization, never a user easing result. Capture
    // the scale before invoking user code: a reentrant sample can resize the
    // shared geometry without changing this call's result.
    const eased = easing && maximum;
    const currentScale = scale;
    let d = distances?.[index];
    if (d === undefined) {
      d = distance(index % columns, Math.floor(index / columns));
      d = eased ? d / maximum : d * duration;
      if (distances) distances[index] = d;
    }
    return startDelay + (eased ? easing(d) * currentScale : d);
  };
}
function randomStagger(duration, startDelay, easing, grid) {
  let ranks,
    count = 0;
  return (index, total) => {
    if (
      !Number.isSafeInteger(total) ||
      total < 1 ||
      total > 0xffffffff ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= total
    )
      throw new RangeError(
        "random stagger requires an index within an array-sized collection",
      );
    if (total !== count) {
      // Fisher-Yates gives every permutation equal probability under a uniform
      // RNG. Construction is lazy; asking for samples never reshuffles a group.
      const next = new Uint32Array(total);
      for (let i = 0; i < total; i++) next[i] = i;
      for (let i = total - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const old = next[i];
        next[i] = next[j];
        next[j] = old;
      }
      ranks = next;
      count = total;
    }
    // List easing uses the collection length; grid easing includes both ends
    // of the shuffled rank range, as it does for ordinary grid distances.
    const rank = ranks[index],
      range = total - (grid ? 1 : 0);
    return (
      startDelay +
      duration * (easing && range ? easing(rank / range) * range : rank)
    );
  };
}
module.exports = { interpolate, mixNumber, stagger };
