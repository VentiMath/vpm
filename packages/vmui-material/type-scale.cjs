"use strict";
const { default: deepmerge } = require("vmui-utils/deepmerge");
const family = '"Roboto", "Helvetica", "Arial", sans-serif';
// Material type-scale measurements: variant, size, line height, tracking, weight.
const scale = [
  ["h1", 96, 1.167, -1.5, "Light"],
  ["h2", 60, 1.2, -0.5, "Light"],
  ["h3", 48, 1.167, 0, "Regular"],
  ["h4", 34, 1.235, 0.25, "Regular"],
  ["h5", 24, 1.334, 0, "Regular"],
  ["h6", 20, 1.6, 0.15, "Medium"],
  ["subtitle1", 16, 1.75, 0.15, "Regular"],
  ["subtitle2", 14, 1.57, 0.1, "Medium"],
  ["body1", 16, 1.5, 0.15, "Regular"],
  ["body2", 14, 1.43, 0.15, "Regular"],
  ["button", 14, 1.75, 0.4, "Medium"],
  ["caption", 12, 1.66, 0.4, "Regular"],
  ["overline", 12, 2.66, 1, "Regular"],
];
function createTypography(palette, options = {}) {
  const settings = typeof options === "function" ? options(palette) : options;
  const {
    fontFamily = family,
    fontSize = 14,
    htmlFontSize = 16,
    fontWeightLight = 300,
    fontWeightRegular = 400,
    fontWeightMedium = 500,
    fontWeightBold = 700,
    pxToRem: customRem,
    allVariants,
    ...overrides
  } = settings;
  const coefficient = fontSize / 14;
  const pxToRem =
    customRem || ((pixels) => (pixels / htmlFontSize) * coefficient + "rem");
  const output = {
    fontFamily,
    fontSize,
    htmlFontSize,
    fontWeightLight,
    fontWeightRegular,
    fontWeightMedium,
    fontWeightBold,
    pxToRem,
  };
  for (const [name, size, lineHeight, tracking, weight] of scale) {
    const variant = {
      fontFamily,
      fontWeight: output["fontWeight" + weight],
      fontSize: pxToRem(size),
      lineHeight,
    };
    if (fontFamily === family)
      variant.letterSpacing =
        Math.round((tracking / size) * 100000) / 100000 + "em";
    if (name === "button" || name === "overline")
      variant.textTransform = "uppercase";
    output[name] = allVariants
      ? Object.assign(variant, deepmerge({}, allVariants))
      : variant;
  }
  output.inherit = {
    fontFamily: "inherit",
    fontWeight: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    letterSpacing: "inherit",
  };
  return deepmerge(output, overrides);
}
module.exports = { createTypography };
