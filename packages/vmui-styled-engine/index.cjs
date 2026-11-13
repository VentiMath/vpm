"use strict";
const React = require("react"),
  emotion = require("vemotion-react"),
  base = require("vemotion-styled").default,
  { serializeStyles } = require("vemotion-serialize");
function styled(tag, options) {
  return base(tag, options);
}
Object.assign(styled, base);
function internal_mutateStyles(tag, processor) {
  if (tag && Array.isArray(tag.__emotion_styles)) {
    const result = processor(tag.__emotion_styles);
    if (!Array.isArray(result))
      throw new TypeError("The style processor must return an array");
    tag.__emotion_styles = result;
  }
}
function internal_serializeStyles(styles) {
  return serializeStyles([styles]);
}
function GlobalStyles({ styles, defaultTheme = {} }) {
  const resolved = React.useMemo(
    () =>
      typeof styles === "function"
        ? (theme) =>
            styles(theme && Object.keys(theme).length ? theme : defaultTheme)
        : styles,
    [styles, defaultTheme],
  );
  return React.createElement(emotion.Global, { styles: resolved });
}
function StyledEngineProvider({
  children,
  injectFirst = false,
  enableCssLayer = false,
}) {
  if (injectFirst || enableCssLayer)
    throw new TypeError(
      "VentiMath owns its Emotion cache and CSS layers; provider-managed cache modes are outside this adapter contract",
    );
  return React.createElement(React.Fragment, null, children);
}
module.exports = {
  __esModule: true,
  default: styled,
  ThemeContext: emotion.ThemeContext,
  keyframes: emotion.keyframes,
  css: emotion.css,
  GlobalStyles,
  StyledEngineProvider,
  internal_mutateStyles,
  internal_serializeStyles,
};
