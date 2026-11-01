'use strict';
const {format} = require('node:util');
const {traceContext} = require('../common/trace.js');
const {CONSOLE_SEVERITY, UNPATCHED_CONSOLE} = require('./common.js');

// Build JSON data without invoking inherited fields or mutating the caller.
// Track the current path rather than all previously visited objects: repeated
// sibling references are legitimate data, while ancestor references are cycles.
function jsonValue(value, parents = new Set(), depth = 0) {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (parents.has(value)) return '[Circular]';
  if (depth >= 256) return '[MaxDepth]';
  parents.add(value);
  try {
    const convert = value.toJSON;
    if (typeof convert === 'function') {
      const converted = convert.call(value);
      if (converted !== value) return jsonValue(converted, parents, depth + 1);
    }
    const copy = Array.isArray(value) ? new Array(value.length) : {};
    for (const key of Object.keys(value)) {
      let item;
      try {item = jsonValue(value[key], parents, depth + 1);}
      catch {item = '[Error - cannot serialize]';}
      if (key === '__proto__') Object.defineProperty(copy, key, {value: item, enumerable: true, writable: true, configurable: true});
      else copy[key] = item;
    }
    return copy;
  } finally {parents.delete(value);}
}

function write(entry) {
  if (!entry || !Object.hasOwn(CONSOLE_SEVERITY, entry.severity)) throw new TypeError('A log entry needs a supported severity');
  let data;
  try {data = jsonValue(entry);}
  catch {data = {severity: entry.severity, message: '[Error - cannot serialize]'};}
  const trace = traceContext.getStore()?.traceId;
  if (trace && data && typeof data === 'object') data['logging.googleapis.com/trace'] = `projects/${process.env.GCLOUD_PROJECT}/traces/${trace}`;
  UNPATCHED_CONSOLE[CONSOLE_SEVERITY[entry.severity]](JSON.stringify(data));
}

function emit(severity, args) {
  const last = args.at(-1);
  const metadata = last && typeof last === 'object' &&
    (Object.getPrototypeOf(last) === Object.prototype || Object.getPrototypeOf(last) === null) ? args.pop() : undefined;
  const entry = {};
  if (metadata) for (const key of Object.keys(metadata)) {
    let value;
    try {value = metadata[key];}
    catch {value = '[Error - cannot serialize]';}
    if (key === '__proto__') Object.defineProperty(entry, key, {value, enumerable: true, writable: true, configurable: true});
    else entry[key] = value;
  }
  entry.severity = severity;
  let message = format(...args);
  if (severity === 'ERROR' && !args.some(value => value instanceof Error)) message = new Error(message).stack || message;
  if (message) entry.message = message;
  write(entry);
}

const debug = (...args) => emit('DEBUG', args);
const info = (...args) => emit('INFO', args);
const log = (...args) => emit('INFO', args);
const warn = (...args) => emit('WARNING', args);
const error = (...args) => emit('ERROR', args);
const logger = {write, debug, info, log, warn, error};
Object.assign(exports, logger, {logger});
// Existing provider modules use this generated namespace name. It points to the
// independently written public methods while those providers are replaced.
exports.logger_exports = {...logger, logger};
