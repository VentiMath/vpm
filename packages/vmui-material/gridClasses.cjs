"use strict";
const {gridClasses, getGridUtilityClass} = require("./grid-layout.cjs");
module.exports = {...gridClasses, default: gridClasses, getGridUtilityClass};
