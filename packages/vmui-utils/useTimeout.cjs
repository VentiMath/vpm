"use strict";
const api = require("./src/hooks.cjs");
module.exports = {
  __esModule: true,
  default: api.useTimeout,
  Timeout: require("./src/dom.cjs").Timeout,
};
