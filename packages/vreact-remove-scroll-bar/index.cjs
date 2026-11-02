"use strict";
const React = require("react");
const { styleSingleton } = require("vreact-style-singleton");
const constants = require("./constants.cjs");
const {
  zeroRightClassName,
  fullWidthClassName,
  noScrollbarsClassName,
  removedBarSizeVariable,
} = constants;
const Style = styleSingleton();
const attribute = "data-scroll-locked";

function getGapWidth(mode = "margin") {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !document.body
  ) {
    return { left: 0, top: 0, right: 0, gap: 0 };
  }
  const computed = window.getComputedStyle(document.body);
  const padding = mode === "padding";
  const left =
    parseInt(padding ? computed.paddingLeft : computed.marginLeft, 10) || 0;
  const top =
    parseInt(padding ? computed.paddingTop : computed.marginTop, 10) || 0;
  const right =
    parseInt(padding ? computed.paddingRight : computed.marginRight, 10) || 0;
  return {
    left,
    top,
    right,
    gap: Math.max(
      0,
      window.innerWidth - document.documentElement.clientWidth + right - left,
    ),
  };
}

function count(body) {
  const value = parseInt(body.getAttribute(attribute) || "0", 10);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
function useBodyLock() {
  React.useEffect(() => {
    const body = document.body;
    if (!body) return;
    body.setAttribute(attribute, String(count(body) + 1));
    return () => {
      const remaining = count(body) - 1;
      if (remaining > 0) body.setAttribute(attribute, String(remaining));
      else body.removeAttribute(attribute);
    };
  }, []);
}

function styles(offset, mode, relative, important) {
  const suffix = important ? " !important" : "";
  const px = (n) => n + "px";
  const declaration = (name, value, priority = false) =>
    `${name}:${value}${priority ? suffix : ""};`;
  const rule = (selector, declarations) => `${selector}{${declarations}}`;
  const gap = px(offset.gap);
  let body =
    declaration("overflow", "hidden", true) +
    declaration("overscroll-behavior", "contain");
  if (relative) body += declaration("position", "relative", true);
  if (mode === "margin") {
    for (const side of ["left", "top", "right"])
      body += declaration("padding-" + side, px(offset[side]));
    body +=
      declaration("margin-left", "0") +
      declaration("margin-top", "0") +
      declaration("margin-right", gap, true);
  } else if (mode === "padding")
    body += declaration("padding-right", gap, true);
  body += declaration(removedBarSizeVariable, gap);
  return (
    rule(
      "." + noScrollbarsClassName,
      declaration("overflow", "hidden", true) +
        declaration("padding-right", gap, true),
    ) +
    rule(`body[${attribute}]`, body) +
    rule("." + zeroRightClassName, declaration("right", gap, true)) +
    rule("." + fullWidthClassName, declaration("margin-right", gap, true)) +
    rule(
      `.${zeroRightClassName} .${zeroRightClassName}`,
      declaration("right", "0", true),
    ) +
    rule(
      `.${fullWidthClassName} .${fullWidthClassName}`,
      declaration("margin-right", "0", true),
    )
  );
}

function RemoveScrollBar({ noRelative, noImportant, gapMode = "margin" }) {
  useBodyLock();
  const offset = React.useMemo(() => getGapWidth(gapMode), [gapMode]);
  const css = React.useMemo(
    () => styles(offset, gapMode, !noRelative, !noImportant),
    [offset, gapMode, noRelative, noImportant],
  );
  return React.createElement(Style, { styles: css });
}

exports.RemoveScrollBar = RemoveScrollBar;
exports.getGapWidth = getGapWidth;
exports.zeroRightClassName = zeroRightClassName;
exports.fullWidthClassName = fullWidthClassName;
exports.noScrollbarsClassName = noScrollbarsClassName;
exports.removedBarSizeVariable = removedBarSizeVariable;
