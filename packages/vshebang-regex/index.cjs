"use strict";
// Keep both the full marker line and its body. JavaScript has four line terminators.
// No global/multiline flag: repeated calls are independent and only offset zero matches.
module.exports = /^#!([^\r\n\u2028\u2029]*)/;
