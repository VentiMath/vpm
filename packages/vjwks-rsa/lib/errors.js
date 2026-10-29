'use strict';
class ArgumentError extends Error { constructor(message) { super(message); this.name = 'ArgumentError'; } }
class JwksError extends Error { constructor(message) { super(message); this.name = 'JwksError'; } }
class JwksRateLimitError extends Error { constructor(message = 'Too many requests to the JWKS endpoint') { super(message); this.name = 'JwksRateLimitError'; } }
class SigningKeyNotFoundError extends Error { constructor(message) { super(message); this.name = 'SigningKeyNotFoundError'; } }
module.exports = { ArgumentError, JwksError, JwksRateLimitError, SigningKeyNotFoundError };
