"use strict";
const api = require("../palette.cjs");
module.exports = {
  __esModule: true,
  default: api.createPalette,
  light: api.light,
  dark: api.dark,
  contrastColor: api.contrastColor,
};
