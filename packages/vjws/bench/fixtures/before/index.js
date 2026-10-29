'use strict';
// Derived from jws (MIT); see LICENSE and PROVENANCE.json.
const core = require('./lib/core');
exports.ALGORITHMS = core.ALGORITHMS;
exports.sign = core.sign;
exports.verify = core.verify;
exports.decode = core.decode;
exports.isValid = token => core.parse(token, false) !== null;
exports.createSign = options => require('./lib/streams').createSign(options);
exports.createVerify = options => require('./lib/streams').createVerify(options);
