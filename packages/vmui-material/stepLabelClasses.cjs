"use strict";
const {
  stepLabelClasses,
  getStepLabelUtilityClass,
} = require("./registration-steps.cjs");
module.exports = {
  ...stepLabelClasses,
  default: stepLabelClasses,
  getStepLabelUtilityClass,
};
