"use strict";
const api = require("./src/data.cjs");
module.exports = {
  __esModule: true,
  default: api.deepmerge,
  isPlainObject: api.isPlainObject,
};
