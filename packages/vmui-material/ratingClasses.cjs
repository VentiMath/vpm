"use strict";
const {
  ratingClasses,
  getRatingUtilityClass,
} = require("./rating-control.cjs");
module.exports = {
  ...ratingClasses,
  default: ratingClasses,
  getRatingUtilityClass,
};
