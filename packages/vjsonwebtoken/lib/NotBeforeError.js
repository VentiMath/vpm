'use strict';
const JsonWebTokenError = require('./JsonWebTokenError');
class NotBeforeError extends JsonWebTokenError {
  constructor(message, date) { super(message); this.date = date; }
}
module.exports = NotBeforeError;
