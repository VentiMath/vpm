"use strict";
const React = require("react");
function validator(check) {
  const run =
    (required) =>
    (props, key, component = "Component", location = "prop", full = key) => {
      const value = props[key];
      if (value == null)
        return required
          ? new TypeError(component + ": " + full + " is required")
          : null;
      return check(value)
        ? null
        : new TypeError(component + ": invalid " + location + " " + full);
    };
  const optional = run(false);
  optional.isRequired = run(true);
  return optional;
}
const refType = validator(
  (value) => typeof value === "function" || typeof value === "object",
);
const elementAcceptingRef = validator(React.isValidElement);
const elementTypeAcceptingRef = validator(
  (value) =>
    typeof value === "string" ||
    typeof value === "function" ||
    (value &&
      [
        Symbol.for("react.forward_ref"),
        Symbol.for("react.memo"),
        Symbol.for("react.lazy"),
      ].includes(value.$$typeof)),
);
const integerPropType = validator(Number.isInteger);
const getTypeByValue = (v) =>
  v == null ? String(v) : Array.isArray(v) ? "array" : typeof v;
const HTMLElementType = (props, key, name) =>
  props[key] == null || props[key]?.nodeType === 1
    ? null
    : new TypeError(name + ": " + key + " must be an element");
const chainPropTypes =
  (first, second) =>
  (...args) =>
    first(...args) || second(...args);
const deprecatedPropType =
  (check, reason) =>
  (...args) =>
    args[0][args[1]] == null
      ? null
      : check(...args) ||
        new TypeError("Deprecated " + args[1] + ": " + reason);
const unsupportedProp = (props, key, name) =>
  props[key] === undefined
    ? null
    : new TypeError(name + ": unsupported " + key);
function requirePropFactory(name, Component) {
  return (dependency) =>
    (props, key, ...rest) => {
      const valid = Component?.propTypes?.[key]?.(props, key, ...rest);
      if (valid) return valid;
      return props[key] !== undefined && !props[dependency]
        ? new TypeError(name + ": " + key + " requires " + dependency)
        : null;
    };
}
function exactProp(types) {
  return {
    ...types,
    __vpm_exact_props__: (props) => {
      const unknown = Object.keys(props).filter(
        (k) => !Object.hasOwn(types, k),
      );
      return unknown.length
        ? new TypeError("Unknown props: " + unknown.join(", "))
        : null;
    },
  };
}
module.exports = {
  refType,
  elementAcceptingRef,
  elementTypeAcceptingRef,
  integerPropType,
  getTypeByValue,
  HTMLElementType,
  chainPropTypes,
  deprecatedPropType,
  unsupportedProp,
  requirePropFactory,
  exactProp,
};
