"use strict";
const {
  stepClasses,
  getStepUtilityClass,
} = require("./registration-steps.cjs");
module.exports = {
  ...stepClasses,
  default: stepClasses,
  getStepUtilityClass,
};
