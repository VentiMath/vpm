"use strict";
module.exports = require("./light.cjs");
const schema = require("./schema.cjs");
module.exports.build = "full";
module.exports.parse = schema.parse;
module.exports.tokenize = schema.tokenize;
module.exports.common = schema.common;
