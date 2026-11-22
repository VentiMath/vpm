"use strict";
const { normalize, ...versions } = require("./versions.cjs");
module.exports = {
  ...versions,
  ...require("./ranges.cjs"),
  SEMVER_SPEC_VERSION: "2.0.0",
};
