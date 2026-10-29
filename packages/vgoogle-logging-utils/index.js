'use strict';
const {EventEmitter} = require('node:events');
const {format, formatWithOptions} = require('node:util');
const env = Object.freeze({nodeEnables: 'GOOGLE_SDK_NODE_LOGGING'});
const LogSeverity = Object.freeze({DEFAULT: 'DEFAULT', DEBUG: 'DEBUG', INFO: 'INFO', WARNING: 'WARNING', ERROR: 'ERROR'});
const severityFields = Object.fromEntries(Object.values(LogSeverity).map(severity => [severity, Object.freeze({severity})]));
const noop = () => {};
const loggerCache = new Map();
let backend;
function filterSnapshot(filters) {
  if (!Array.isArray(filters) || filters.some(value => typeof value !== 'string')) throw new TypeError('Filters must be an array of strings');
  return Object.freeze(filters.map(value => value.trim()));
}
function matches(namespace, pattern) {
  if (pattern === '*') return true;
  const parts = pattern.split('*');
  if (parts.length === 1) return namespace === pattern;
  if (!namespace.startsWith(parts[0]) || !namespace.endsWith(parts[parts.length - 1])) return false;
  let position = parts[0].length;
  const end = namespace.length - parts[parts.length - 1].length;
  for (let i = 1; i < parts.length - 1; i++) {
    const found = namespace.indexOf(parts[i], position);
    if (found < 0 || found + parts[i].length > end) return false;
    position = found + parts[i].length;
  }
  return position <= end;
}
class AdhocDebugLogger extends EventEmitter {
  constructor(namespace, upstream = noop) {
    super();
    this.namespace = namespace;
    this.upstream = upstream;
    const fn = (fields, ...args) => this.invoke(fields, ...args);
    fn.instance = this;
    fn.on = (event, listener) => { this.on(event, listener); return fn; };
    fn.debug = (...args) => this.invoke(severityFields.DEBUG, ...args);
    fn.info = (...args) => this.invoke(severityFields.INFO, ...args);
    fn.warn = (...args) => this.invoke(severityFields.WARNING, ...args);
    fn.error = (...args) => this.invoke(severityFields.ERROR, ...args);
    fn.sublog = name => log(name, fn);
    this.func = fn;
  }
  invoke(fields, ...args) {
    try { this.upstream(fields, ...args); } catch { /* Logging must not interrupt the application. */ }
    if (this.listenerCount('log')) {
      // Preserve once-listener wrappers and isolate each tap's failure.
      for (const listener of this.rawListeners('log')) {
        try { listener.call(this, fields, args); } catch { /* Do not print failed sink diagnostics. */ }
      }
    }
  }
  invokeSeverity(severity, ...args) { this.invoke(severityFields[severity] || {severity}, ...args); }
}
const placeholder = (() => {
  const instance = new AdhocDebugLogger('');
  const fn = () => {};
  fn.instance = instance;
  fn.on = () => fn;
  fn.debug = fn.info = fn.warn = fn.error = noop;
  fn.sublog = () => fn;
  instance.func = fn;
  return Object.freeze(fn);
})();
class DebugLogBackendBase {
  constructor() {
    const value = process.env[env.nodeEnables] ?? '*';
    this.filters = filterSnapshot(value === 'all' || value === 'true' ? ['*'] : value.split(','));
    this.filtersSet = false;
    this.cached = new Map();
  }
  log(namespace, fields, ...args) {
    try {
      if (!this.filtersSet) { this.setFilters(); this.filtersSet = true; }
      let logger = this.cached.get(namespace);
      if (!logger) { logger = this.makeLogger(namespace); this.cached.set(namespace, logger); }
      if (logger !== noop) logger(fields, ...args);
    } catch { /* Backend failures must neither escape nor expose logged data. */ }
  }
}
class NodeBackend extends DebugLogBackendBase {
  #patterns = [];
  constructor(structured = false) { super(); this.structured = structured; }
  setFilters(filters = this.filters) {
    this.filters = filterSnapshot(filters);
    this.#patterns = this.filters.map(value => value.toLowerCase());
    this.cached.clear(); this.filtersSet = true;
  }
  isEnabled(namespace) {
    if (!this.filtersSet) this.setFilters();
    const lower = namespace.toLowerCase();
    return this.#patterns.some(pattern => matches(lower, pattern));
  }
  makeLogger(namespace) {
    if (!this.isEnabled(namespace)) return noop;
    if (this.structured) return (_fields, json) => console.log('%s', json);
    const colours = !!(process.stderr.isTTY && (typeof process.stderr.getColorDepth !== 'function' || process.stderr.getColorDepth() > 2));
    const prefix = colours ? '\x1b[33m' + process.pid + '\x1b[0m [\x1b[32m' + namespace + '\x1b[0m|' : process.pid + ' [' + namespace + '|';
    const options = {colors: colours};
    return (fields, ...args) => {
      fields ??= {};
      const severity = fields.severity ?? 'DEFAULT';
      const colour = colours ? {ERROR: '\x1b[31m', INFO: '\x1b[35m', WARNING: '\x1b[33m'}[severity] : '';
      const level = colour ? colour + severity + '\x1b[0m' : severity;
      let extra;
      for (const key of Object.keys(fields)) if (key !== 'severity') { extra ??= {}; Object.defineProperty(extra, key, {value: fields[key], enumerable: true}); }
      const text = extra ? JSON.stringify(extra) : '';
      const suffix = text ? ' ' + (colours ? '\x1b[90m' + text + '\x1b[0m' : text) : '';
      console.error('%s%s] %s%s', prefix, level, formatWithOptions(options, ...args), suffix);
    };
  }
}
class DebugBackend extends DebugLogBackendBase {
  constructor(pkg) {
    super();
    if (typeof pkg !== 'function' || typeof pkg.enable !== 'function') throw new TypeError('A debug-compatible factory with enable() is required');
    this.debugPkg = pkg;
    this.existingFilters = typeof pkg.namespaces === 'string' ? pkg.namespaces : process.env.DEBUG || '';
  }
  setFilters(filters = this.filters) {
    const snapshot = filterSnapshot(filters);
    this.debugPkg.enable([this.existingFilters, ...snapshot].filter(Boolean).join(','));
    this.filters = snapshot; this.cached.clear(); this.filtersSet = true;
  }
  makeLogger(namespace) { const logger = this.debugPkg(namespace); return (_fields, ...args) => logger(...args); }
}
class StructuredBackend extends DebugLogBackendBase {
  constructor(upstream = new NodeBackend(true)) {
    super();
    if (!upstream || typeof upstream.log !== 'function' || typeof upstream.setFilters !== 'function') throw new TypeError('A logging backend is required');
    this.upstream = upstream;
  }
  setFilters(filters = this.filters) {
    this.filters = filterSnapshot(filters);
    this.upstream.setFilters(this.filters); this.cached.clear(); this.filtersSet = true;
  }
  makeLogger(namespace) {
    return (fields, ...args) => {
      // Explicit fields cannot replace the actual formatted message or its default severity.
      const json = {severity: fields?.severity ?? 'INFO', message: format(...args)};
      if (fields) for (const key of Object.keys(fields)) if (key !== 'severity' && key !== 'message') Object.defineProperty(json, key, {value: fields[key], enumerable: true});
      this.upstream.log(namespace, fields, JSON.stringify(json));
    };
  }
}
function getNodeBackend() { return new NodeBackend(); }
function getDebugBackend(pkg) { return new DebugBackend(pkg); }
function getStructuredBackend(upstream) { return new StructuredBackend(upstream); }
function setBackend(value) {
  if (value != null && (typeof value.log !== 'function' || typeof value.setFilters !== 'function')) throw new TypeError('A logging backend is required');
  backend = value;
}
function log(namespace, parent) {
  if (backend === null || (backend === undefined && !process.env[env.nodeEnables]) || !namespace) return placeholder;
  if (typeof namespace !== 'string') throw new TypeError('Namespace must be a string');
  if (parent) {
    if (typeof parent.instance?.namespace !== 'string') throw new TypeError('Parent must be a logger');
    namespace = parent.instance.namespace + ':' + namespace;
  }
  let logger = loggerCache.get(namespace);
  if (logger) return logger.func;
  if (backend === undefined) backend = getNodeBackend();
  logger = new AdhocDebugLogger(namespace, (fields, ...args) => {
    if (backend === undefined) backend = getNodeBackend();
    backend?.log(namespace, fields, ...args);
  });
  loggerCache.set(namespace, logger);
  return logger.func;
}
exports.LogSeverity = LogSeverity;
exports.AdhocDebugLogger = AdhocDebugLogger;
exports.DebugLogBackendBase = DebugLogBackendBase;
exports.placeholder = placeholder;
exports.env = env;
exports.getNodeBackend = getNodeBackend;
exports.getDebugBackend = getDebugBackend;
exports.getStructuredBackend = getStructuredBackend;
exports.setBackend = setBackend;
exports.log = log;
