'use strict';
const JsonWebTokenError = require('./JsonWebTokenError');
class TokenExpiredError extends JsonWebTokenError {
  constructor(message, expiredAt) { super(message); this.expiredAt = expiredAt; }
}
module.exports = TokenExpiredError;
