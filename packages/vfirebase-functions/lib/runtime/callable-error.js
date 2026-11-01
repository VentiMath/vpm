'use strict';
// Canonical Google RPC codes and their HTTP mapping are protocol data.
const statuses = Object.freeze(Object.fromEntries([
  ['ok', 200], ['cancelled', 499], ['unknown', 500], ['invalid-argument', 400],
  ['deadline-exceeded', 504], ['not-found', 404], ['already-exists', 409],
  ['permission-denied', 403], ['unauthenticated', 401], ['resource-exhausted', 429],
  ['failed-precondition', 400], ['aborted', 409], ['out-of-range', 400],
  ['unimplemented', 501], ['internal', 500], ['unavailable', 503], ['data-loss', 500],
].map(([code, status]) => [code, Object.freeze({canonicalName: code.toUpperCase().replaceAll('-', '_'), status})])));
class HttpsError extends Error {
  constructor(code, message, details) {
    super(message);
    if (!Object.hasOwn(statuses, code)) throw new Error(`Unknown error code: ${code}.`);
    this.code = code;
    this.details = details;
    this.httpErrorCode = statuses[code];
  }
  toJSON() {
    const result = {};
    if (this.details !== undefined) result.details = this.details;
    result.message = this.message;
    result.status = this.httpErrorCode.canonicalName;
    return result;
  }
}
exports.HttpsError = HttpsError;
