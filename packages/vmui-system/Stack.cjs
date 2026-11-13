"use strict";
const api = require("./index.cjs");
module.exports = {
	__esModule: true,
	default: api.Stack,
	createStack: api.createStack,
	stackClasses: api.stackClasses,
	getStackUtilityClass: api.getStackUtilityClass,
};
