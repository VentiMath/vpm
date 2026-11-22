"use strict";
const {
  sliderClasses,
  getSliderUtilityClass,
} = require("./font-slider.cjs");
module.exports = {
  ...sliderClasses,
  default: sliderClasses,
  getSliderUtilityClass,
};
