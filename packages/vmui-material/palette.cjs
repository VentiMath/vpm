"use strict";
const { deepmerge } = require("vmui-utils");
const { darken, lighten, getContrastRatio } = require("vmui-system");
const roles = ["primary", "secondary", "error", "warning", "info", "success"];
const ramps = {
  light: [
    "1976d2 42a5f5 1565c0",
    "9c27b0 ba68c8 7b1fa2",
    "d32f2f ef5350 c62828",
    "ed6c02 ff9800 e65100",
    "0288d1 03a9f4 01579b",
    "2e7d32 4caf50 1b5e20",
  ],
  dark: [
    "90caf9 e3f2fd 42a5f5",
    "ce93d8 f3e5f5 ab47bc",
    "f44336 e57373 d32f2f",
    "ffa726 ffb74d f57c00",
    "29b6f6 4fc3f7 0288d1",
    "66bb6a 81c784 388e3c",
  ],
};
const grey = Object.fromEntries(
  "50:fafafa 100:f5f5f5 200:eeeeee 300:e0e0e0 400:bdbdbd 500:9e9e9e 600:757575 700:616161 800:424242 900:212121 A100:f5f5f5 A200:eeeeee A400:bdbdbd A700:616161"
    .split(" ")
    .map((pair) => {
      const [key, value] = pair.split(":");
      return [key, "#" + value];
    }),
);
function defaults(mode) {
  const dark = mode === "dark";
  const ink = dark ? "255, 255, 255" : "0, 0, 0";
  const tint = (opacity) => "rgba(" + ink + ", " + opacity + ")";
  return {
    text: dark
      ? {
          primary: "#fff",
          secondary: tint(0.7),
          disabled: tint(0.5),
          icon: tint(0.5),
        }
      : { primary: tint(0.87), secondary: tint(0.6), disabled: tint(0.38) },
    divider: tint(0.12),
    background: {
      paper: dark ? "#121212" : "#fff",
      default: dark ? "#121212" : "#fff",
    },
    action: {
      active: dark ? "#fff" : tint(0.54),
      hover: tint(dark ? 0.08 : 0.04),
      hoverOpacity: dark ? 0.08 : 0.04,
      selected: tint(dark ? 0.16 : 0.08),
      selectedOpacity: dark ? 0.16 : 0.08,
      disabled: tint(dark ? 0.3 : 0.26),
      disabledBackground: tint(0.12),
      disabledOpacity: 0.38,
      focus: tint(0.12),
      focusOpacity: 0.12,
      activatedOpacity: dark ? 0.24 : 0.12,
    },
  };
}
const light = defaults("light"),
  dark = defaults("dark");
function contrastColor(background) {
  return "oklch(from " + background + " var(--__l) 0 h / var(--__a))";
}
function createPalette(options = {}) {
  const {
    mode = "light",
    contrastThreshold = 3,
    tonalOffset = 0.2,
    colorSpace,
    ...custom
  } = options;
  if (mode !== "light" && mode !== "dark")
    throw new TypeError("Palette mode must be light or dark");
  const getContrastText = (background) =>
    colorSpace
      ? contrastColor(background)
      : getContrastRatio(background, "#fff") >= contrastThreshold
        ? "#fff"
        : "rgba(0, 0, 0, 0.87)";
  const offsets =
    typeof tonalOffset === "number"
      ? { light: tonalOffset, dark: tonalOffset * 1.5 }
      : tonalOffset;
  function augmentColor({
    color,
    mainShade = 500,
    lightShade = 300,
    darkShade = 700,
    name,
  }) {
    const result = { ...color };
    if (!result.main && Object.hasOwn(result, mainShade))
      result.main = result[mainShade];
    if (typeof result.main !== "string")
      throw new TypeError(
        "Palette color " +
          (name ?? "") +
          " requires a string main color or shade " +
          mainShade,
      );
    for (const [direction, shade, adjust, endpoint] of [
      ["light", lightShade, lighten, "#fff"],
      ["dark", darkShade, darken, "#000"],
    ]) {
      if (result[direction]) continue;
      if (Object.hasOwn(result, shade)) result[direction] = result[shade];
      else
        result[direction] = colorSpace
          ? "color-mix(in " +
            colorSpace +
            ", " +
            result.main +
            ", " +
            endpoint +
            " " +
            (offsets[direction] * 100).toFixed(0) +
            "%)"
          : adjust(result.main, offsets[direction]);
    }
    if (!result.contrastText)
      result.contrastText = getContrastText(result.main);
    return result;
  }
  const palette = {
    mode,
    common: { black: "#000", white: "#fff" },
    grey: { ...grey },
    contrastThreshold,
    tonalOffset,
    getContrastText,
    augmentColor,
    ...defaults(mode),
  };
  for (const [index, role] of roles.entries()) {
    const [main, light, dark] = ramps[mode][index]
      .split(" ")
      .map((hex) => "#" + hex);
    palette[role] = augmentColor({
      color: options[role] || { main, light, dark },
      name: role,
      ...(role === "secondary"
        ? { mainShade: "A400", lightShade: "A200", darkShade: "A700" }
        : {}),
    });
  }
  return deepmerge(palette, custom);
}
module.exports = { createPalette, light, dark, contrastColor };
