'use strict';
class JsonWebTokenError extends Error {
  constructor(message, error) {
    super(message);
    this.name = new.target.name;
    if (error) this.inner = error;
    Error.captureStackTrace?.(this, new.target);
  }
}
module.exports = JsonWebTokenError;
