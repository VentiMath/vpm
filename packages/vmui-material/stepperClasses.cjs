"use strict";
const {
  stepperClasses,
  getStepperUtilityClass,
} = require("./registration-steps.cjs");
module.exports = {
  ...stepperClasses,
  default: stepperClasses,
  getStepperUtilityClass,
};
