"use strict";
const React = require("react");
const { GlobalStyles, useThemeProps } = require("./theme.cjs");

function baseline(theme, includeScheme) {
  const { typography, palette } = theme;
  const colors = theme.vars?.palette ?? palette;
  const background = colors.background.default;
  const bodyText = typography.body1 ?? {
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeightRegular,
    fontSize: "1rem",
    lineHeight: 1.5,
    letterSpacing: "0.00938em",
  };
  const sheet = {
    html: {
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      boxSizing: "border-box",
      WebkitTextSizeAdjust: "100%",
      ...(includeScheme && !theme.vars && { colorScheme: palette.mode }),
    },
    "*, *::before, *::after": { boxSizing: "inherit" },
    "strong, b": { fontWeight: typography.fontWeightBold },
    body: {
      margin: 0,
      color: colors.text.primary,
      ...bodyText,
      backgroundColor: background,
      "@media print": { backgroundColor: colors.common?.white ?? "#fff" },
      "&::backdrop": { backgroundColor: background },
    },
  };
  if (includeScheme && theme.getColorSchemeSelector) {
    for (const [name, scheme] of Object.entries(theme.colorSchemes ?? {})) {
      const selector = theme.getColorSchemeSelector(name);
      const mode = { colorScheme: scheme.palette?.mode };
      if (selector.startsWith("@")) sheet[selector] = { ":root": mode };
      else sheet[selector.replace(/\s*&/, "")] = mode;
    }
  }
  const overrides = theme.components?.MuiCssBaseline?.styleOverrides;
  return overrides ? [sheet, overrides] : sheet;
}
const normal = (theme) => baseline(theme, false);
const withScheme = (theme) => baseline(theme, true);
function CssBaseline(input) {
  const { children, enableColorScheme } = useThemeProps({
    props: input,
    name: "MuiCssBaseline",
  });
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(GlobalStyles, {
      styles: enableColorScheme ? withScheme : normal,
    }),
    children,
  );
}
module.exports = CssBaseline;
module.exports.default = CssBaseline;
