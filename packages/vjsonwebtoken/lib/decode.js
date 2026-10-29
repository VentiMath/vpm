'use strict';
const jws = require('vjws');
function normalize(decoded) {
  if (decoded && typeof decoded.payload === 'string') {
    try {
      const value = JSON.parse(decoded.payload);
      if (value !== null && typeof value === 'object') decoded.payload = value;
    } catch { /* Non-JSON string payloads are part of the upstream API. */ }
  }
  return decoded;
}
function decode(token, options) {
  const decoded = normalize(jws.decode(token, options));
  return decoded === null ? null : options?.complete === true ? decoded : decoded.payload;
}
module.exports = decode;
module.exports.normalize = normalize;
