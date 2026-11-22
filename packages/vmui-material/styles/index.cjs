"use strict";
const a=require("../theme.cjs");
const colors = require("vmui-system");
module.exports={ThemeProvider:a.ThemeProvider,useTheme:a.useTheme,styled:a.styled,useThemeProps:a.useThemeProps,useColorScheme:a.useColorScheme,THEME_ID:a.THEME_ID,
  alpha: colors.alpha,
  darken: colors.darken,
  decomposeColor: colors.decomposeColor,
  emphasize: colors.emphasize,
  getContrastRatio: colors.getContrastRatio,
  getLuminance: colors.getLuminance,
  hexToRgb: colors.hexToRgb,
  hslToRgb: colors.hslToRgb,
  lighten: colors.lighten,
  recomposeColor: colors.recomposeColor,
  rgbToHex: colors.rgbToHex,
};

module.exports.createTheme = require("../create-theme.cjs").createTheme;
