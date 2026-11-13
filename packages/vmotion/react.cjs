"use strict";
const React = require("react"), dom = require("vmotion-dom");
const h = React.createElement, Tree = React.createContext(null), Config = React.createContext({ reducedMotion: "never" });
const useLayout = typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;
const transforms = ["x", "y", "z", "translateX", "translateY", "translateZ", "scale", "scaleX", "scaleY", "rotate", "rotateX", "rotateY", "rotateZ", "skewX", "skewY"];
const transformKeys = new Set(transforms);
const reserved = /* @__PURE__ */ new Set(["initial", "animate", "variants", "transition", "custom", "inherit", "onAnimationStart", "onAnimationComplete", "onUpdate", "transformTemplate"]);
const unsupported = /* @__PURE__ */ new Set(["exit", "layout", "layoutId", "drag", "dragConstraints", "whileHover", "whileTap", "whileFocus", "whileInView", "whileDrag", "onPan", "onDrag", "onViewportEnter"]);
function copy(value, seen = /* @__PURE__ */ new Set()) {
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) throw new TypeError("Animation inputs must not be cyclic");
  seen.add(value);
  const result = Array.isArray(value) ? [] : {};
  for (const key of Object.keys(value)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) throw new TypeError("Unsafe animation key");
    result[key] = copy(value[key], seen);
  }
  seen.delete(value);
  return result;
}
function equal(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && equal(a[k], b[k]));
}
const label = (value) => typeof value === "string" || Array.isArray(value) && value.every((v) => typeof v === "string");
function resolve(props, definition) {
  if (!definition || typeof definition === "boolean" || typeof definition.subscribe === "function") return {};
  if (label(definition)) {
    const result = {};
    for (const name of typeof definition === "string" ? [definition] : definition) {
      let target = Object.hasOwn(props.variants || {}, name) ? props.variants[name] : void 0;
      if (typeof target === "function") target = target(props.custom);
      if (target) Object.assign(result, target);
    }
    return result;
  }
  if (typeof definition !== "object" || Array.isArray(definition)) throw new TypeError("animate requires a target, variant label or animation controls");
  return definition;
}
function values(target, last = false) {
  const result = {};
  for (const [key, value] of Object.entries(target)) if (!["transition", "transitionEnd"].includes(key) && value !== void 0) {
    if (Array.isArray(value)) {
      const usable = value.filter((x) => x !== null);
      if (usable.length) result[key] = usable[last ? usable.length - 1 : 0];
    } else result[key] = value;
  }
  return result;
}
function cssStyle(input) {
  const style = {}, parts = [];
  let nonIdentity = false;
  for (const [key, value] of Object.entries(input)) if (!transformKeys.has(key)) style[key] = value;
  for (const key of transforms) if (input[key] !== void 0) {
    const value = input[key], scale = key.startsWith("scale"), angle = /^(rotate|skew)/.test(key);
    nonIdentity ||= value !== (scale ? 1 : 0);
    const name = key === "x" ? "translateX" : key === "y" ? "translateY" : key === "z" ? "translateZ" : key;
    parts.push(name + "(" + value + (typeof value === "number" ? scale ? "" : angle ? "deg" : "px" : "") + ")");
  }
  if (parts.length) style.transform = nonIdentity ? parts.join(" ") : "none";
  return style;
}
function stop(record) {
  record.generation++;
  for (const c of record.controls) c.stop();
  record.controls = [];
}
function ordered(record) {
  return [...record.children].filter((c) => c.alive && c.node && c.props.inherit !== false && c.props.animate === void 0).sort((a, b) => a.node === b.node ? 0 : a.node.compareDocumentPosition(b.node) & 2 ? 1 : -1);
}
function specification(record, definition, override = {}) {
  const target = copy(resolve(record.props, definition));
  const transition = { ...record.config.transition, ...record.props.transition, ...target.transition, ...override };
  delete target.transition;
  return { target, transition, reducedMotion: record.config.reducedMotion };
}
async function run(record, definition, override = {}, delay = 0) {
  if (!record.alive || !record.node) return;
  const { target, transition } = specification(record, definition, override);
  stop(record);
  const generation = record.generation;
  const { transitionEnd, ...frames } = target;
  const children = label(definition) ? ordered(record) : [];
  const childDelay = transition.delayChildren || 0, step = transition.staggerChildren || 0;
  if (typeof childDelay !== "number" || typeof step !== "number" || !Number.isFinite(childDelay) || !Number.isFinite(step)) throw new TypeError("Child delays must be finite numbers");
  const options = { ...transition, delay: (transition.delay || 0) + delay };
  for (const key of ["when", "delayChildren", "staggerChildren", "staggerDirection"]) delete options[key];
  options.reduceMotion = record.config.reducedMotion === "always" || record.config.reducedMotion === "user" && record.node.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const startChildren = () => Promise.all(children.map((child, index) => run(child, definition, {}, delay + childDelay + step * (transition.staggerDirection === -1 ? children.length - 1 - index : index))));
  const own = async () => {
    if (!record.alive || record.generation !== generation) return;
    record.props.onAnimationStart?.(definition);
    if (!record.alive || record.generation !== generation) return;
    record.controls = dom.animateElement(record.node, frames, options);
    await Promise.all(record.controls.map((c) => c.finished));
    if (record.alive && record.generation === generation && transitionEnd) {
      const ends = dom.animateElement(record.node, transitionEnd, { duration: 0 });
      record.controls.push(...ends);
      await Promise.all(ends.map((c) => c.finished));
    }
  };
  if (transition.when === "beforeChildren") {
    await own();
    if (record.alive && record.generation === generation) await startChildren();
  } else if (transition.when === "afterChildren") {
    await startChildren();
    await own();
  } else await Promise.all([own(), startChildren()]);
  if (record.alive && record.generation === generation) record.props.onAnimationComplete?.(definition);
}
const queue = /* @__PURE__ */ new Set();
let queued = false;
function schedule(record) {
  queue.add(record);
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    const work = [...queue];
    queue.clear();
    const jobs = [];
    for (const r of work) {
      if (!r.alive || r.props.animate?.subscribe) continue;
      const def = r.props.animate === void 0 ? r.inherited : r.props.animate;
      const spec = specification(r, def);
      if (equal(spec, r.lastAuto)) continue;
      r.lastAuto = copy(spec);
      if (r.first && r.initialBlocked) {
        r.first = false;
        continue;
      }
      r.first = false;
      jobs.push({ r, def });
    }
    for (const { r, def } of jobs) {
      let parent = r.parent, owned = false;
      let descendant = r;
      while (parent && descendant.props.animate === void 0 && descendant.props.inherit !== false) {
        if (jobs.some((job) => job.r === parent) && label(parent.props.animate === void 0 ? parent.inherited : parent.props.animate)) {
          owned = true;
          break;
        }
        descendant = parent;
        parent = parent.parent;
      }
      if (owned) continue;
      run(r, def).catch((error) => {
        if (r.alive) {
          if (typeof reportError === "function") reportError(error);
          else setTimeout(() => {
            throw error;
          });
        }
      });
    }
  });
}
function makeControls() {
  const members = /* @__PURE__ */ new Set();
  return {
    subscribe(record) {
      members.add(record);
      return () => members.delete(record);
    },
    start(definition, transition) {
      return Promise.all([...members].map((r) => run(r, definition, transition))).then(() => void 0);
    },
    stop() {
      for (const record of members) stop(record);
    },
    set(definition) {
      for (const record of members) {
        stop(record);
        const target = values(resolve(record.props, definition), true);
        record.controls = dom.animateElement(record.node, target, { duration: 0 });
        for (const c of record.controls) c.complete();
        dom.styleEffect.flush(record.node);
      }
    }
  };
}
function useAnimation() {
  const [controls] = React.useState(makeControls);
  React.useEffect(() => () => controls.stop(), [controls]);
  return controls;
}
function MotionConfig({ children, ...config }) {
  const parent = React.useContext(Config);
  const value = React.useMemo(() => ({ ...parent, ...config }), [parent, config.reducedMotion, config.transition]);
  return h(Config.Provider, { value }, children);
}
function useReducedMotion() {
  const media = React.useMemo(() => typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null, []);
  const subscribe = React.useCallback((notify) => {
    media?.addEventListener("change", notify);
    return () => media?.removeEventListener("change", notify);
  }, [media]);
  return React.useSyncExternalStore(subscribe, () => media?.matches || false, () => null);
}
const cache = /* @__PURE__ */ new Map();
function create(Component) {
  if (cache.has(Component)) return cache.get(Component);
  const Motion = React.forwardRef(function Motion2(props, forwardedRef) {
    for (const key of unsupported) if (props[key] !== void 0 && props[key] !== false) throw new TypeError(key + " is outside the VentiMath Motion React contract");
    if (props.transformTemplate || props.onUpdate) throw new TypeError("transformTemplate/onUpdate are not implemented in the React layer");
    const context = React.useContext(Tree), config = React.useContext(Config);
    const inherited = props.inherit === false ? void 0 : context?.animate;
    const animate = props.animate === void 0 ? inherited : props.animate;
    const initial = props.initial === void 0 ? props.inherit === false ? void 0 : context?.initial : props.initial;
    const initialBlocked = initial === false;
    // React diffs this stable initial pose while the DOM animator owns later frames.
    // Ordinary style props remain live and are not captured in the initial pose.
    const [firstStyle] = React.useState(() => cssStyle(values(resolve(props, initialBlocked ? animate : initial), initialBlocked)));
    const [record] = React.useState(() => ({ node: null, props: null, children: /* @__PURE__ */ new Set(), controls: [], generation: 0, alive: false, first: true, lastAuto: null }));
    const ref = React.useCallback((node) => {
      record.node = node;
      let cleanup;
      if (typeof forwardedRef === "function") cleanup = forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
      return () => {
        if (typeof cleanup === "function") cleanup();
        else if (typeof forwardedRef === "function") forwardedRef(null);
        else if (forwardedRef) forwardedRef.current = null;
        record.node = null;
      };
    }, [record, forwardedRef]);
    useLayout(() => {
      const mountedNode = record.node;
      record.alive = true;
      record.parent = context?.record;
      record.parent?.children.add(record);
      return () => {
        record.alive = false;
        queue.delete(record);
        record.parent?.children.delete(record);
        stop(record);
        if (mountedNode) dom.releaseElement(mountedNode);
        record.lastAuto = null;
      };
    }, [record, context?.record]);
    useLayout(() => {
      record.props = props;
      record.config = config;
      record.inherited = inherited;
      record.initialBlocked = initialBlocked;
      schedule(record);
    });
    useLayout(() => props.animate?.subscribe?.(record), [props.animate, record]);
    useLayout(() => {
      if (config.reducedMotion !== "user") return;
      const media = record.node?.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)");
      const change = () => {
        record.lastAuto = null;
        schedule(record);
      };
      media?.addEventListener("change", change);
      return () => media?.removeEventListener("change", change);
    }, [config.reducedMotion, record]);
    const native = {};
    for (const [key, value] of Object.entries(props)) if (!reserved.has(key) && !unsupported.has(key) && key !== "style") native[key] = value;
    const tree = React.useMemo(() => ({ record, initial, animate: label(animate) ? animate : void 0 }), [record, initial, animate]);
    return h(Tree.Provider, { value: tree }, h(Component, { ...native, ref, style: { ...cssStyle(props.style || {}), ...firstStyle } }, props.children));
  });
  Motion.displayName = "motion." + (typeof Component === "string" ? Component : Component.displayName || Component.name || "component");
  cache.set(Component, Motion);
  return Motion;
}
const motion = new Proxy(create, { get(target, key) {
  if (key === "create") return create;
  if (key === "then" || typeof key === "symbol") return void 0;
  if (key in target) return target[key];
  return create(key);
} });
module.exports = { motion, useAnimation, useAnimationControls: useAnimation, MotionConfig, useReducedMotion };
