'use strict';
// Derived from jsonwebtoken (MIT); see LICENSE and PROVENANCE.json.
exports.decode = require('./lib/decode');
exports.sign = require('./lib/sign');
exports.verify = require('./lib/verify');
exports.JsonWebTokenError = require('./lib/JsonWebTokenError');
exports.NotBeforeError = require('./lib/NotBeforeError');
exports.TokenExpiredError = require('./lib/TokenExpiredError');
