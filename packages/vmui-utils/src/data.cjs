"use strict";
const React = require("react");
const { clsx } = require("vclsx");
const own = (o, k) => Object.hasOwn(o, k);
const put = (o, k, v) => {
  if (k === "__proto__")
    Object.defineProperty(o, k, {
      value: v,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  else o[k] = v;
};
function isPlainObject(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Symbol.iterator in value ||
    Symbol.toStringTag in value
  )
    return false;
  const p = Object.getPrototypeOf(value);
  return (
    p === null || p === Object.prototype || Object.getPrototypeOf(p) === null
  );
}
function deepmerge(target, source, { clone = true } = {}) {
  const seen = new Set();
  function copy(value) {
    if (React.isValidElement(value)) return value;
    if (!isPlainObject(value)) return value;
    return merge({}, value, true);
  }
  function merge(a, b, fresh) {
    const out = fresh ? { ...a } : a;
    if (!isPlainObject(a) || !isPlainObject(b)) return out;
    if (seen.has(b)) throw TypeError("Cannot merge cyclic objects");
    seen.add(b);
    try {
      for (const key of Object.keys(b)) {
        const value = b[key];
        put(
          out,
          key,
          !React.isValidElement(value) &&
            isPlainObject(value) &&
            own(a, key) &&
            isPlainObject(a[key])
            ? merge(a[key], value, fresh)
            : fresh
              ? copy(value)
              : value,
        );
      }
      return out;
    } finally {
      seen.delete(b);
    }
  }
  return merge(target, source, clone);
}
function assignObject(out, input, parent) {
  let ancestry;
  for (const key in input) {
    if (!own(input, key)) continue;
    const value = input[key];
    if (
      value !== null &&
      typeof value === "object" &&
      isPlainObject(value) &&
      !React.isValidElement(value)
    ) {
      if (value === input) throw TypeError("Cannot assign cyclic objects");
      for (let cursor = parent; cursor; cursor = cursor.parent)
        if (cursor.input === value)
          throw TypeError("Cannot assign cyclic objects");
      ancestry ??= { input, parent };
      const previous = own(out, key) && isPlainObject(out[key]) ? out[key] : {};
      put(out, key, assignObject(previous, value, ancestry));
    } else put(out, key, value);
  }
  return out;
}
function fastDeepAssign(target, source) {
  return isPlainObject(source) ? assignObject(target, source, null) : target;
}

function fastObjectShallowCompare(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => own(b, k) && Object.is(a[k], b[k]));
}
function resolveProps(defaults, props, mergeClassNameAndStyle = false) {
  const out = { ...props };
  for (const key of Object.keys(defaults || {})) {
    if (key === "components" || key === "slots") {
      put(out, key, { ...defaults[key], ...out[key] });
      continue;
    }
    if (key === "componentsProps" || key === "slotProps") {
      const slots = { ...out[key] };
      for (const slot of Object.keys(defaults[key] || {})) {
        const a = defaults[key][slot],
          b = slots[slot];
        put(
          slots,
          slot,
          b === undefined ? a : resolveProps(a, b, mergeClassNameAndStyle),
        );
      }
      put(out, key, slots);
      continue;
    }
    if (mergeClassNameAndStyle && key === "className") {
      put(out, key, clsx(defaults[key], out[key]));
      continue;
    }
    if (mergeClassNameAndStyle && key === "style") {
      put(out, key, { ...defaults[key], ...out[key] });
      continue;
    }
    if (out[key] === undefined) put(out, key, defaults[key]);
  }
  return out;
}
let classGenerator = (name) => name;
const ClassNameGenerator = {
  configure(fn) {
    if (typeof fn !== "function")
      throw TypeError("Class-name generator must be a function");
    classGenerator = fn;
  },
  generate(name) {
    return classGenerator(name);
  },
  reset() {
    classGenerator = (name) => name;
  },
};
const globalStateClasses = Object.fromEntries(
  [
    "active",
    "checked",
    "completed",
    "disabled",
    "error",
    "expanded",
    "focused",
    "focusVisible",
    "open",
    "readOnly",
    "required",
    "selected",
  ].map((x) => [x, x]),
);
const isGlobalState = (slot) => own(globalStateClasses, slot);
const generateUtilityClass = (component, slot, prefix = "Mui") =>
  isGlobalState(slot)
    ? prefix + "-" + slot
    : ClassNameGenerator.generate(component) + "-" + slot;
function generateUtilityClasses(name, slots, prefix) {
  const result = {};
  for (const slot of slots)
    put(result, slot, generateUtilityClass(name, slot, prefix));
  return result;
}
function composeClasses(slots, getUtilityClass, classes) {
  const out = {};
  for (const key of Object.keys(slots)) {
    let result = "";
    for (const slot of slots[key])
      if (slot) {
        if (result) result += " ";
        result += getUtilityClass(slot);
        if (classes && own(classes, slot) && classes[slot])
          result += " " + classes[slot];
      }
    put(out, key, result);
  }
  return out;
}

const capitalize = (text) => {
  if (typeof text !== "string") throw TypeError("Expected a string");
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const isObjectEmpty = (obj) => Object.keys(obj).length === 0;
const isEventHandler = (key, value) =>
  /^on[A-Z]/.test(key) && typeof value === "function";
const extractEventHandlers = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {}).filter(([k, v]) => isEventHandler(k, v)),
  );
const omitEventHandlers = (obj) =>
  Object.fromEntries(
    Object.entries(obj || {}).filter(([k, v]) => !isEventHandler(k, v)),
  );
const resolveComponentProps = (props, state, slotState) =>
  typeof props === "function" ? props(state, slotState) : props;
const isHostComponent = (type) => typeof type === "string";
function appendOwnerState(type, props, state) {
  return !type || isHostComponent(type)
    ? props
    : { ...props, ownerState: { ...props?.ownerState, ...state } };
}
function mergeSlotProps({
  getSlotProps,
  externalSlotProps,
  externalForwardedProps,
  additionalProps,
  className,
}) {
  const external = { ...externalForwardedProps, ...externalSlotProps };
  const internal = getSlotProps
    ? getSlotProps(extractEventHandlers(external))
    : undefined;
  const props = {
    ...internal,
    ...additionalProps,
    ...(getSlotProps
      ? omitEventHandlers(externalForwardedProps)
      : externalForwardedProps),
    ...(getSlotProps
      ? omitEventHandlers(externalSlotProps)
      : externalSlotProps),
  };
  const classes = clsx(
    internal?.className,
    additionalProps?.className,
    className,
    externalForwardedProps?.className,
    externalSlotProps?.className,
  );
  const style = {
    ...internal?.style,
    ...additionalProps?.style,
    ...externalForwardedProps?.style,
    ...externalSlotProps?.style,
  };
  if (classes) props.className = classes;
  if (Object.keys(style).length) props.style = style;
  return { props, internalRef: internal?.ref };
}
function getDisplayName(component) {
  if (typeof component === "string") return component;
  if (typeof component === "function")
    return component.displayName || component.name || "Component";
  if (component && component.$$typeof === Symbol.for("react.forward_ref"))
    return (
      component.displayName ||
      "ForwardRef" +
        (component.render?.displayName || component.render?.name
          ? "(" + getDisplayName(component.render) + ")"
          : "")
    );
  if (component && component.$$typeof === Symbol.for("react.memo"))
    return (
      component.displayName || "memo(" + getDisplayName(component.type) + ")"
    );
  return undefined;
}
const isMuiElement = (element, names) =>
  React.isValidElement(element) &&
  names.includes(
    element.type?.muiName ?? element.type?._payload?.value?.muiName,
  );
const getValidReactChildren = (children) =>
  React.Children.toArray(children).filter(React.isValidElement);
const getReactElementRef = (element) => {
  if (!React.isValidElement(element))
    throw TypeError("Expected a React element");
  return element.props.ref ?? null;
};
const getReactNodeRef = (element) =>
  React.isValidElement(element) ? getReactElementRef(element) : null;
const formatMuiErrorMessage = (code, ...args) =>
  "Minified MUI error #" +
  code +
  "; visit https://mui.com/production-error/?code=" +
  code +
  args.map((a) => "&args[]=" + encodeURIComponent(a)).join("") +
  " for the full message.";
const visuallyHidden = {
  border: 0,
  clipPath: "inset(50%)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
};
module.exports = {
  isPlainObject,
  deepmerge,
  fastDeepAssign,
  fastObjectShallowCompare,
  resolveProps,
  ClassNameGenerator,
  globalStateClasses,
  isGlobalState,
  generateUtilityClass,
  generateUtilityClasses,
  composeClasses,
  capitalize,
  clamp,
  isObjectEmpty,
  isEventHandler,
  extractEventHandlers,
  omitEventHandlers,
  resolveComponentProps,
  isHostComponent,
  appendOwnerState,
  mergeSlotProps,
  getDisplayName,
  isMuiElement,
  getValidReactChildren,
  getReactElementRef,
  getReactNodeRef,
  formatMuiErrorMessage,
  visuallyHidden,
  ponyfillGlobal: globalThis,
};
