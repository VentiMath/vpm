"use strict";
const api = require("./src/data.cjs");
module.exports = {
  __esModule: true,
  default: api.generateUtilityClass,
  globalStateClasses: api.globalStateClasses,
  isGlobalState: api.isGlobalState,
};
