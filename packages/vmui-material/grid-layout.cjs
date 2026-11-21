"use strict";
const { createGrid, gridClasses, getGridUtilityClass } = require("vmui-system");
const { styled, useTheme, useThemeProps } = require("./theme.cjs");

const Grid = createGrid({
  createStyledComponent: styled("div", {
    name: "MuiGrid",
    slot: "Root",
    overridesResolver: ({ ownerState }, styles) => [
      styles.root,
      ownerState.container && styles.container,
    ],
  }),
  useTheme,
  useThemeProps: (props) => useThemeProps({ props, name: "MuiGrid" }),
});
module.exports = { Grid, gridClasses, getGridUtilityClass };
