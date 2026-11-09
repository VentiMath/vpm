"use strict";
const { frame, cancelFrame } = require("./frame.cjs");
const transformOrder = [
  "transformPerspective",
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
  "skew",
  "skewX",
  "skewY",
];
const transforms = new Set(transformOrder),
  origins = new Set(["originX", "originY", "originZ"]);
const pixels = new Set([
  "width",
  "maxWidth",
  "height",
  "maxHeight",
  "top",
  "right",
  "bottom",
  "left",
  "fontSize",
  "backgroundPositionX",
  "backgroundPositionY",
  "distance",
  "perspective",
  "transformPerspective",
  "x",
  "y",
  "z",
  "translateX",
  "translateY",
  "translateZ",
  "originZ",
  "borderWidth",
  "borderRadius",
]);
for (const base of ["margin", "padding", "inset"]) {
  pixels.add(base);
  for (const side of [
    "Top",
    "Right",
    "Bottom",
    "Left",
    "Block",
    "BlockStart",
    "BlockEnd",
    "Inline",
    "InlineStart",
    "InlineEnd",
  ])
    pixels.add(base + side);
}
for (const side of ["Top", "Right", "Bottom", "Left"])
  pixels.add("border" + side + "Width");
for (const corner of ["TopLeft", "TopRight", "BottomLeft", "BottomRight"])
  pixels.add("border" + corner + "Radius");
const angles = new Set([
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skew",
  "skewX",
  "skewY",
  "pathRotation",
]);
const alpha = new Set(["opacity", "fillOpacity", "strokeOpacity"]);
const svgCase = new Set([
  "baseFrequency",
  "diffuseConstant",
  "kernelMatrix",
  "kernelUnitLength",
  "keySplines",
  "keyTimes",
  "limitingConeAngle",
  "markerHeight",
  "markerWidth",
  "numOctaves",
  "targetX",
  "targetY",
  "surfaceScale",
  "specularConstant",
  "specularExponent",
  "stdDeviation",
  "tableValues",
  "viewBox",
  "gradientTransform",
  "pathLength",
  "startOffset",
  "textLength",
  "lengthAdjust",
  "preserveAspectRatio",
]);
const pathKeys = new Set(["pathLength", "pathSpacing", "pathOffset"]);
const dash = (key) => key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
function valid(value) {
  if (typeof value === "number" && !Number.isFinite(value))
    throw new RangeError("effect values must be finite");
  return value;
}
const asPixels = (value) =>
  typeof value === "number" ? valid(value) + "px" : value;
const asDegrees = (value) =>
  typeof value === "number" ? valid(value) + "deg" : value;
const asPercent = (value) =>
  typeof value === "number" ? valid(value) * 100 + "%" : value;
const asAlpha = (value) =>
  typeof value === "number" ? Math.max(0, Math.min(1, valid(value))) : value;
const asInteger = (value) =>
  typeof value === "number" ? Math.round(valid(value)) : value;
function converter(key) {
  if (pixels.has(key)) return asPixels;
  if (angles.has(key)) return asDegrees;
  if (key === "originX" || key === "originY") return asPercent;
  if (alpha.has(key)) return asAlpha;
  if (key === "zIndex" || key === "numOctaves") return asInteger;
  return valid;
}
const formatted = (key, value) => converter(key)(value);
const transformInfo = new Map(
  transformOrder.map((key, order) => [
    key,
    {
      key,
      order,
      defaultValue: key.startsWith("scale") ? 1 : 0,
      prefix:
        (key === "transformPerspective"
          ? "perspective"
          : key.length === 1
            ? "translate" + key.toUpperCase()
            : key) + "(",
      numericSuffix: pixels.has(key) ? "px)" : angles.has(key) ? "deg)" : ")",
    },
  ]),
);
function resolveElements(input, scope, cache) {
  if (input == null) return [];
  if (typeof input === "string") {
    const root =
      scope?.current ??
      (typeof document === "undefined" ? undefined : document);
    if (!root) return [];
    let found = cache && Object.hasOwn(cache, input) ? cache[input] : undefined;
    if (!found) {
      found = root.querySelectorAll(input);
      if (cache)
        Object.defineProperty(cache, input, {
          value: found,
          configurable: true,
          writable: true,
          enumerable: true,
        });
    }
    return Array.from(found);
  }
  if (input.nodeType === 1) return [input];
  if (
    typeof input[Symbol.iterator] === "function" ||
    typeof input.length === "number"
  )
    return Array.from(input);
  throw new TypeError("expected an element, element collection or selector");
}
function attributeWriter(element, key, name = key) {
  // A setter carries boolean/number types correctly (e.g. checked, value).
  let object = element,
    setter;
  while (object && !setter) {
    const descriptor = Object.getOwnPropertyDescriptor(object, name);
    if (descriptor) {
      setter = descriptor.set;
      break;
    }
    object = Object.getPrototypeOf(object);
  }
  if (/^(aria|data)[A-Z]/.test(name)) name = dash(name);
  return setter
    ? (value) => setter.call(element, formatted(key, value))
    : (value) => element.setAttribute(name, String(formatted(key, value)));
}
function styleWriter(element, key) {
  const format = converter(key);
  return key.startsWith("--") || key.includes("-")
    ? (value) => element.style.setProperty(key, format(value))
    : (value) => {
        element.style[key] = format(value);
      };
}
class BindingState {
  constructor(subject, kind) {
    this.subject = subject;
    this.kind = kind;
    this.bindings = new Map();
    this.retained = undefined;
    this.groups = undefined;
    this.transformKeys = undefined;
    this.flush = () => {
      if (this.flushing) return;
      this.flushing = true;
      const ready = Array.from(
        new Set(Array.from(this.bindings.values(), (binding) => binding.job)),
      ).filter((job) => job.queued);
      let failure;
      for (const job of ready) {
        try {
          cancelFrame(job.run);
          if (job.queued) job.run();
        } catch (e) {
          failure ??= { error: e };
        }
      }
      this.flushing = false;
      if (failure) throw failure.error;
    };
  }
  queue(job) {
    if (job.queued) return;
    job.queued = true;
    frame.render(job.run);
  }
  job(active, paint) {
    const job = {
      active,
      queued: false,
      users: 0,
      run: () => {
        job.queued = false;
        if (active()) paint();
      },
    };
    return job;
  }
  get(key) {
    return this.bindings.get(key)?.value;
  }
  group(name) {
    this.groups ??= new Map();
    let job = this.groups.get(name);
    if (!job) {
      job = this.job(
        () => job.users > 0,
        () => this.renderGroup(name),
      );
      this.groups.set(name, job);
    }
    return job;
  }
  read(key, fallback) {
    const binding = this.bindings.get(key);
    const value = binding ? binding.value.get() : this.retained?.get(key);
    if (binding) binding.written = value;
    return value === undefined ? fallback : value;
  }
  renderGroup(group) {
    const e = this.subject;
    if (group === "transform") {
      const direct = this.read("transform");
      if (direct !== undefined) {
        e.style.transform = direct;
        return;
      }
      let transform = "";
      for (const slot of this.transformKeys ?? []) {
        const { info, binding } = slot;
        const value = binding.active ? binding.value.get() : binding.written;
        if (binding.active) binding.written = value;
        if (
          value === undefined ||
          (typeof value === "string" ? parseFloat(value) : value) ===
            info.defaultValue
        )
          continue;
        // Compose directly, retaining validation but avoiding an array and a
        // separate unit string for every component on every paint.
        if (typeof value === "number" && !Number.isFinite(value))
          throw new RangeError("effect values must be finite");
        const suffix = typeof value === "number" ? info.numericSuffix : ")";
        transform += (transform ? " " : "") + info.prefix + value + suffix;
      }
      if (!e.style.transformBox) e.style.transformBox = "fill-box";
      e.style.transform = transform || "none";
    } else if (group === "origin") {
      e.style.transformOrigin =
        formatted("originX", this.read("originX", 0.5)) +
        " " +
        formatted("originY", this.read("originY", 0.5)) +
        " " +
        formatted("originZ", this.read("originZ", "0"));
    } else {
      const has = (key) => this.bindings.has(key) || this.retained?.has(key);
      const length = this.read("pathLength", 1),
        spacing = this.read("pathSpacing", 1 - length),
        offset = this.read("pathOffset", 0);
      for (const value of [length, spacing, offset])
        if (!Number.isFinite(value))
          throw new TypeError("SVG path progress must be finite numbers");
      e.setAttribute("pathLength", "1");
      if (has("pathLength") || has("pathSpacing"))
        e.setAttribute("stroke-dasharray", length + " " + spacing);
      if (has("pathOffset"))
        e.setAttribute("stroke-dashoffset", String(-offset));
    }
  }
  bind(key, value) {
    let group, write;
    const { subject, kind } = this;
    if (kind === "prop")
      write = (v) => {
        subject[key] = v;
      };
    else if (kind === "attr") write = attributeWriter(subject, key);
    else if (transforms.has(key) || key === "transform") group = "transform";
    else if (origins.has(key)) group = "origin";
    else if (kind === "svg" && pathKeys.has(key)) group = "path";
    else if (kind === "svg" && key.startsWith("attr") && key.length > 4) {
      const name = key[4].toLowerCase() + key.slice(5);
      write = attributeWriter(
        subject,
        name,
        svgCase.has(name) ? name : dash(name),
      );
    } else if (
      kind === "svg" &&
      !key.startsWith("--") &&
      !(key in subject.style)
    ) {
      write = attributeWriter(subject, key, svgCase.has(key) ? key : dash(key));
    } else write = styleWriter(subject, key);
    const binding = {
      value,
      group,
      written: undefined,
      off: undefined,
      active: true,
    };
    const info = transformInfo.get(key);
    const job = group
      ? this.group(group)
      : {
          active: () => binding.active,
          queued: false,
          run: () => {
            job.queued = false;
            if (!binding.active) return;
            const v = value.get();
            if (v !== undefined) {
              write(v);
              binding.written = v;
            }
          },
        };
    binding.job = job;
    const unsubscribe = value.on("change", () => this.queue(job));
    // Subscribe first: a rejected subscription must not detach its predecessor.
    this.bindings.get(key)?.off();
    this.bindings.set(key, binding);
    if (info) {
      this.transformKeys ??= [];
      const slot = this.transformKeys.find((slot) => slot.info === info);
      if (slot) slot.binding = binding;
      else {
        this.transformKeys.push({ info, binding });
        this.transformKeys.sort((a, b) => a.info.order - b.info.order);
      }
    }
    if (group) job.users++;
    binding.off = () => {
      if (this.bindings.get(key) !== binding) return;
      this.bindings.delete(key);
      binding.active = false;
      if (group) job.users--;
      unsubscribe();
      if (group && binding.written !== undefined)
        (this.retained ??= new Map()).set(key, binding.written);
      if (!group || !job.active()) {
        job.queued = false;
        cancelFrame(job.run);
      }
    };
    this.queue(job);
    return binding.off;
  }
  release() {
    const values = new Map();
    for (const [key, binding] of this.bindings) {
      values.set(key, binding.value);
      binding.off();
    }
    this.retained?.clear();
    if (this.transformKeys) this.transformKeys.length = 0;
    return values;
  }
}
function effect(kind) {
  const states = new WeakMap();
  function apply(subject, values) {
    const subjects =
      kind === "prop" ? [subject] : [...new Set(resolveElements(subject))];
    const entries = Object.entries(values);
    // Validate every binding before changing any subject.
    for (const [key, value] of entries) {
      if (["__proto__", "prototype", "constructor"].includes(key))
        throw new TypeError("unsafe effect property");
      if (
        !value ||
        typeof value.get !== "function" ||
        typeof value.on !== "function"
      )
        throw new TypeError("effects require MotionValue bindings");
    }
    for (const s of subjects) {
      if (!s || (typeof s !== "object" && typeof s !== "function"))
        throw new TypeError("invalid effect subject");
      if ((kind === "style" || kind === "svg") && !s.style)
        throw new TypeError("style effects require element styles");
      if (
        (kind === "attr" || kind === "svg") &&
        typeof s.setAttribute !== "function"
      )
        throw new TypeError("attribute effects require an element");
    }
    const removers = [];
    try {
      for (const s of subjects) {
        let state = states.get(s);
        if (!state) {
          state = new BindingState(s, kind);
          states.set(s, state);
        }
        for (const [key, value] of entries)
          removers.push(state.bind(key, value));
      }
    } catch (error) {
      for (const remove of removers) remove();
      throw error;
    }
    return () => {
      for (const remove of removers) remove();
      removers.length = 0;
    };
  }
  apply.get = (subject, key) =>
    states
      .get(kind === "prop" ? subject : resolveElements(subject)[0])
      ?.get(key);
  apply.flush = (subject) => states.get(subject)?.flush();
  apply.state = (subject) => states.get(subject);
  return apply;
}
const styleEffect = effect("style"),
  attrEffect = effect("attr"),
  propEffect = effect("prop"),
  svgEffect = effect("svg");
function releaseElement(element) {
  const style = styleEffect.state(element),
    svg = svgEffect.state(element);
  if (!style && !svg) return undefined;
  return new Map([...(style?.release() ?? []), ...(svg?.release() ?? [])]);
}
module.exports = {
  styleEffect,
  attrEffect,
  propEffect,
  svgEffect,
  resolveElements,
  releaseElement,
  styleSubjectEffect: styleEffect,
  svgSubjectEffect: svgEffect,
};
