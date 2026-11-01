"use strict";
const fs = require('node:fs');
const {createHash} = require('node:crypto');
const {FirebaseAppError, AppErrorCode} = require('./error');
const invalid = (message, cause) => new FirebaseAppError({code: AppErrorCode.INVALID_CREDENTIAL, message, cause});

// Normalize credential inputs once. Every record is detached and has no
// prototype; cache serialization cannot execute toJSON or inherited hooks.
function jsonCopy(value, active = new Set(), depth = 0) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || depth > 64 || active.has(value)) {
    throw invalid('Credential data must be acyclic JSON data with at most 64 nested containers.');
  }
  const proto = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && proto !== null && proto !== Object.prototype) throw invalid('Credential data must contain plain JSON records.');
  active.add(value);
  const result = Array.isArray(value) ? new Array(value.length) : Object.create(null);
  for (const key of Object.keys(value).sort()) {
    const copied = jsonCopy(value[key], active, depth + 1);
    Object.defineProperty(result, key, {value: copied, enumerable: true, writable: true, configurable: true});
  }
  active.delete(value);
  return result;
}
class CredentialDocument {
  constructor(input, label) {
    this.label = label;
    this.file = typeof input === 'string';
    let data = input;
    if (this.file) {
      let contents;
      try {contents = fs.readFileSync(input, 'utf8');}
      catch (cause) {throw this.error(cause);}
      try {data = JSON.parse(contents);}
      catch {throw this.error(new SyntaxError('Credential JSON is invalid.'));}
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw invalid('Service account must be an object.');
    this.data = jsonCopy(data);
  }
  error(cause) {
    const prefix = `Failed to parse ${this.label} file`;
    return invalid(this.label === 'service account json' ? `${prefix}: ${cause.message}` : `${prefix}.`, cause);
  }
  validate(operation) {
    try {return operation(this.data);}
    catch (cause) {if (this.file) throw this.error(cause); throw cause;}
  }
  digest() {return createHash('sha256').update(encode(this.data)).digest('hex');}
}
function encode(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + Array.from({length: value.length}, (_, index) =>
    Object.hasOwn(value, index) ? encode(value[index]) : 'null').join(',') + ']';
  return '{' + Object.keys(value).map(key => JSON.stringify(key) + ':' + encode(value[key])).join(',') + '}';
}
function field(data, snake, camel = snake) {
  const a = data[snake], b = data[camel];
  if (a && b && a !== b) throw invalid(`Credential properties "${snake}" and "${camel}" conflict.`);
  return a || b;
}
function fields(data, required, message) {
  const normalized = Object.assign(Object.create(null), data);
  for (const [snake, camel] of required) {
    const value = field(data, snake, camel);
    if (typeof value !== 'string' || value.length === 0) throw invalid(message(snake));
    normalized[snake] = value;
  }
  return normalized;
}
exports.CredentialDocument = CredentialDocument;
exports.fields = fields;
exports.invalid = invalid;
