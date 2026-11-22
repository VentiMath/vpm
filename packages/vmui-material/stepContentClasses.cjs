"use strict";
const {
  stepContentClasses,
  getStepContentUtilityClass,
} = require("./course-step-content.cjs");
module.exports = {
  ...stepContentClasses,
  default: stepContentClasses,
  getStepContentUtilityClass,
};
