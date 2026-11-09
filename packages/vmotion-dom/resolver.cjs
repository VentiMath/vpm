"use strict";
const { frame, frameSteps } = require("./frame.cjs");
const {
  getComputedStyle,
  readStyleValue,
  getVariableValue,
  fillWildcards,
} = require("./reads.cjs");
const pending = new Set();
const alreadyRead = new WeakSet();
function rejectResolver(resolver, error) {
  try {
    resolver.cancel();
  } catch {}
}
const positions = new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  "x",
  "y",
]);
const numeric = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const pixels = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?px$/i;
function normalize(value) {
  return typeof value === "string" && numeric.test(value.trim())
    ? Number(value)
    : value;
}
function cssName(name) {
  return name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}
let flushing = false;
function flush(forced) {
  if (flushing) return;
  flushing = true;
  frameSteps.read.cancel(readBatch);
  const batch = Array.from(pending);
  pending.clear();
  let failure;
  const active = [];
  try {
    for (const r of batch)
      if (r.state === "scheduled")
        try {
          if (!alreadyRead.has(r)) r.readKeyframes();
          active.push(r);
        } catch (e) {
          rejectResolver(r, e);
          failure ??= { error: e };
        }
    // Conflicting measurements of the same property get separate transactions.
    // Otherwise the last temporary write would supply both endpoints.
    let passes, seen;
    for (const r of active)
      if (r.state === "scheduled" && r.needsMeasurement) {
        if (!passes) {
          passes = [[]];
          seen = new Map();
        }
        const node = r.element?.current;
        let keys = seen.get(node);
        if (keys?.has(r.name)) {
          passes.push([]);
          seen = new Map();
          keys = undefined;
        }
        if (!keys) seen.set(node, (keys = new Set()));
        keys.add(r.name);
        passes.at(-1).push(r);
      }
    for (const pass of passes || []) {
      try {
        for (const phase of [
          "prepareMeasurement",
          "renderStartStyles",
          "measureInitialState",
          "renderEndStyles",
          "measureEndState",
        ])
          for (const r of pass)
            if (r.state === "scheduled")
              try {
                r[phase]?.();
              } catch (e) {
                rejectResolver(r, e);
                failure ??= { error: e };
              }
      } finally {
        for (let i = pass.length - 1; i >= 0; i--)
          try {
            pass[i].restore?.();
          } catch (e) {
            rejectResolver(pass[i], e);
            failure ??= { error: e };
          }
      }
    }
  } finally {
    flushing = false;
  }
  // Call consumers only after all DOM restoration. Completion can enqueue more
  // resolvers without pulling them into this batch or losing their frame request.
  for (const r of active)
    if (r.state === "scheduled")
      try {
        r.complete(forced);
      } catch (e) {
        failure ??= { error: e };
      }
  if (pending.size) frame.read(readBatch);
  if (failure) throw failure.error;
}
function readBatch() {
  flush(false);
}
function flushKeyframeResolvers() {
  flush(true);
}
// Custom classes can schedule through another runtime's queue. Also register
// them here so synchronous control reads can force the same batched phases.
function trackResolver(resolver) {
  if (resolver.state === "scheduled" && !pending.has(resolver)) {
    pending.add(resolver);
    frame.read(readBatch);
  }
}
function untrackResolver(resolver) {
  pending.delete(resolver);
  if (!pending.size) frameSteps.read.cancel(readBatch);
}
function noteResolverRead(resolver) {
  alreadyRead.add(resolver);
}
function resetResolverRead(resolver) {
  alreadyRead.delete(resolver);
}
class KeyframeResolver {
  constructor(frames, onComplete, name, motionValue, element, isAsync = false) {
    if (!Array.isArray(frames) || !frames.length)
      throw new TypeError("keyframes must be a nonempty array");
    if (typeof onComplete !== "function")
      throw new TypeError("completion must be a function");
    if (
      frames.some(
        (v) => v !== null && typeof v !== "string" && !Number.isFinite(v),
      )
    )
      throw new TypeError(
        "keyframes must contain finite numbers, strings or null",
      );
    this.source = frames.slice();
    this.unresolvedKeyframes = frames.slice();
    this.onComplete = onComplete;
    this.name = name;
    this.motionValue = motionValue;
    this.element = element;
    this.isAsync = isAsync;
    this.needsMeasurement = false;
    this.state = "pending";
  }
  scheduleResolve() {
    if (this.state !== "pending") return;
    this.state = "scheduled";
    if (this.isAsync) {
      pending.add(this);
      frame.read(readBatch);
    } else
      try {
        this.readKeyframes();
        this.complete(false);
      } catch (e) {
        this.cancel();
        throw e;
      }
  }
  readKeyframes() {
    const frames = this.unresolvedKeyframes;
    if (frames[0] === null) {
      let initial = this.motionValue?.get();
      if (initial === undefined && this.element)
        initial =
          this.element.readValue?.(this.name, frames.at(-1)) ??
          (this.element.current
            ? readStyleValue(this.element.current, this.name)
            : undefined);
      initial ??= frames.at(-1);
      if (initial === null || initial === undefined)
        throw new TypeError("cannot resolve the initial keyframe");
      frames[0] = initial;
      if (this.motionValue && this.motionValue.get() === undefined)
        this.motionValue.set(initial);
    }
    fillWildcards(frames);
  }
  setFinalKeyframe() {}
  measureInitialState() {}
  renderEndStyles() {}
  measureEndState() {}
  complete(forced = false) {
    if (this.state !== "scheduled") return;
    pending.delete(this);
    this.state = "complete";
    this.onComplete(
      this.unresolvedKeyframes.slice(),
      this.finalKeyframe,
      forced,
    );
  }
  cancel() {
    pending.delete(this);
    if (this.state !== "complete") this.state = "pending";
    if (!pending.size) frameSteps.read.cancel(readBatch);
  }
  resume() {
    if (this.state === "complete") return;
    this.unresolvedKeyframes = this.source.slice();
    this.finalKeyframe = undefined;
    this.needsMeasurement = false;
    this.scheduleResolve();
  }
}
class DOMKeyframesResolver extends KeyframeResolver {
  constructor(...args) {
    super(...args);
    this.isAsync = true;
  }
  scheduleResolve() {
    const frames = this.unresolvedKeyframes;
    // Pure numeric and uniform-unit endpoints need no browser read.
    this.isAsync =
      frames[0] === null ||
      frames.some(
        (v) =>
          typeof v === "string" &&
          (v.includes("var(") ||
            v === "auto" ||
            v.includes("%") ||
            v.includes("calc(")),
      );
    if (!this.isAsync && positions.has(this.name)) {
      const units = frames
        .filter((v) => v !== null)
        .map((v) =>
          typeof v === "number"
            ? "number"
            : pixels.test(v)
              ? "px"
              : numeric.test(v)
                ? "number"
                : v.replace(/[\d. +-]/g, ""),
        );
      this.isAsync =
        new Set(units).size > 1 &&
        !units.every((u) => u === "number" || u === "px");
    }
    super.scheduleResolve();
  }
  readKeyframes() {
    super.readKeyframes();
    const frames = this.unresolvedKeyframes,
      current = this.element?.current;
    for (let i = 0; i < frames.length; i++) {
      let value = frames[i];
      if (typeof value === "string" && value.trim().startsWith("var(")) {
        if (!current)
          throw new TypeError("CSS variables require a DOM element");
        const resolved = getVariableValue(value, current);
        if (resolved === undefined)
          throw new TypeError("unresolved CSS variable: " + value);
        if (i === frames.length - 1) this.finalKeyframe = value;
        value = resolved;
      }
      frames[i] = normalize(value);
    }
    const allNumeric = frames.every((v) => typeof v === "number");
    const numericPx = frames.every(
      (v) => typeof v === "number" || (typeof v === "string" && pixels.test(v)),
    );
    if (!allNumeric && numericPx) {
      if (positions.has(this.name) && this.source[0] === null)
        for (let i = 0; i < frames.length; i++)
          frames[i] = parseFloat(frames[i]);
      else
        for (let i = 0; i < frames.length; i++)
          if (typeof frames[i] === "number") frames[i] += "px";
    } else if (positions.has(this.name) && !allNumeric) {
      const units = frames.map((v) =>
        typeof v === "number" ? "number" : String(v).replace(/[\d. +-]/g, ""),
      );
      this.needsMeasurement =
        new Set(units).size > 1 || frames.includes("auto");
      if (this.needsMeasurement && frames.length !== 2)
        throw new TypeError(
          "mixed-unit layout resolution requires two keyframes",
        );
    }
  }
  prepareMeasurement() {
    const node = this.element?.current;
    if (!node?.style)
      throw new TypeError("layout measurement requires a DOM element");
    this.node = node;
    const key = this.name;
    if (key === "x" || key === "y") {
      // Translation percentages use the element's untransformed border box.
      this.translation = true;
      const rect = node.getBoundingClientRect();
      const size = getComputedStyle(node, key === "x" ? "width" : "height");
      let basis = parseFloat(size);
      if (getComputedStyle(node, "boxSizing") !== "border-box")
        for (const part of key === "x"
          ? [
              "paddingLeft",
              "paddingRight",
              "borderLeftWidth",
              "borderRightWidth",
            ]
          : [
              "paddingTop",
              "paddingBottom",
              "borderTopWidth",
              "borderBottomWidth",
            ])
          basis += parseFloat(getComputedStyle(node, part)) || 0;
      if (!Number.isFinite(basis))
        basis = key === "x" ? rect.width : rect.height;
      this.unresolvedKeyframes = this.unresolvedKeyframes.map((v) =>
        typeof v === "string" && /^[+-]?[\d.]+%$/.test(v)
          ? (parseFloat(v) * basis) / 100
          : typeof v === "number"
            ? v
            : pixels.test(v)
              ? parseFloat(v)
              : NaN,
      );
      if (this.unresolvedKeyframes.some((v) => !Number.isFinite(v)))
        throw new TypeError(
          "translation measurement supports numbers, px and percent",
        );
      this.finalKeyframe ??= this.source.at(-1);
      return;
    }
    const view = node.ownerDocument?.defaultView;
    if (Number.isFinite(view?.scrollX) && Number.isFinite(view?.scrollY))
      this.scroll = { view, x: view.scrollX, y: view.scrollY };
    const property = cssName(key);
    this.saved = {
      property,
      value: node.style.getPropertyValue(property),
      priority: node.style.getPropertyPriority(property),
    };
  }
  renderStartStyles() {
    if (this.translation) return;
    const start = this.unresolvedKeyframes[0];
    if (typeof start !== "number" && !pixels.test(start))
      this.node.style.setProperty(this.saved.property, start, "important");
  }
  measureInitialState() {
    if (!this.translation)
      this.unresolvedKeyframes[0] = this.measure(this.unresolvedKeyframes[0]);
  }
  measure(value) {
    if (typeof value === "number") return value;
    if (pixels.test(value)) return parseFloat(value);
    const current = getComputedStyle(this.node, this.name),
      number = parseFloat(current);
    if (
      !Number.isFinite(number) ||
      (!pixels.test(current) && !numeric.test(current))
    )
      throw new TypeError("layout did not resolve to a pixel value");
    return number;
  }
  renderEndStyles() {
    if (this.translation) return;
    const end = this.unresolvedKeyframes.at(-1);
    this.node.style.setProperty(
      this.saved.property,
      typeof end === "number" ? end + "px" : end,
      "important",
    );
  }
  measureEndState() {
    if (this.translation) return;
    const final = this.unresolvedKeyframes.at(-1);
    this.unresolvedKeyframes[this.unresolvedKeyframes.length - 1] =
      this.measure(final);
    this.finalKeyframe ??= this.source.at(-1);
  }
  restore() {
    if (!this.saved) return;
    const { property, value, priority } = this.saved;
    this.saved = undefined;
    if (value) this.node.style.setProperty(property, value, priority);
    else this.node.style.removeProperty(property);
    const scroll = this.scroll;
    this.scroll = undefined;
    if (
      scroll &&
      (scroll.view.scrollX !== scroll.x || scroll.view.scrollY !== scroll.y)
    )
      scroll.view.scrollTo(scroll.x, scroll.y);
  }
}
module.exports = {
  KeyframeResolver,
  DOMKeyframesResolver,
  flushKeyframeResolvers,
};
Object.defineProperties(module.exports, {
  trackResolver: { value: trackResolver },
  untrackResolver: { value: untrackResolver },
  noteResolverRead: { value: noteResolverRead },
  resetResolverRead: { value: resetResolverRead },
});
