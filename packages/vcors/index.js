'use strict';
// CORS 2.x-compatible middleware. See LICENSE and PROVENANCE.json.
const vary = require('vvary');
const token = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const tokenList = /^[\t ]*[!#$%&'*+.^_`|~0-9A-Za-z-]+(?:[\t ]*,[\t ]*[!#$%&'*+.^_`|~0-9A-Za-z-]+)*[\t ]*$/;
const invalidHeader = /[^\t\x20-\x7e\x80-\xff]/;
const defaults = 'GET,HEAD,PUT,PATCH,POST,DELETE';
const own = (object, key) => Object.hasOwn(object, key) ? object[key] : undefined;

function header(value, name) {
  if (typeof value !== 'string' || invalidHeader.test(value)) throw new TypeError(name + ' must be a valid header string');
  return value;
}
function list(value, name) {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    const values = new Array(value.length);
    for (let i = 0; i < values.length; i++) {
      const entry = value[i];
      if (typeof entry !== 'string' || !token.test(entry)) throw new TypeError(name + ' must contain HTTP tokens');
      values[i] = entry;
    }
    return values.join(',');
  }
  if (value === '') return value;
  if (typeof value !== 'string' || !tokenList.test(value)) throw new TypeError(name + ' must contain HTTP tokens');
  return value;
}
function flag(value, name) {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') throw new TypeError(name + ' must be a boolean');
  return value;
}
function cloneRegex(value) { return new RegExp(value.source, value.flags); }
function regexMatches(regex, origin) {
  regex.lastIndex = 0;
  return regex.test(origin);
}
function compileOrigin(value, callbackAllowed) {
  if (value == null || value === false || value === '') return false;
  if (value === true) return true;
  if (typeof value === 'string') return header(value, 'origin');
  if (callbackAllowed && typeof value === 'function') return value;
  if (value instanceof RegExp) {
    const regex = cloneRegex(value);
    return { matches: origin => origin !== undefined && regexMatches(regex, origin) };
  }
  if (!Array.isArray(value)) throw new TypeError('origin must be a string, boolean, RegExp, array, or callback');
  // Snapshot nested arrays iteratively; do not inherit RegExp lastIndex or retain
  // user-owned arrays. Active-path tracking permits shared but acyclic subarrays.
  const active = new Set([value]);
  const stack = [{ values: value, length: value.length, index: 0 }];
  const strings = [], regexes = [];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.index === frame.length) { active.delete(frame.values); stack.pop(); continue; }
    const entry = frame.values[frame.index++];
    if (Array.isArray(entry)) {
      if (active.has(entry)) throw new TypeError('origin arrays must not be cyclic');
      active.add(entry); stack.push({ values: entry, length: entry.length, index: 0 });
    } else if (typeof entry === 'string') strings.push(header(entry, 'origin'));
    else if (entry instanceof RegExp) regexes.push(cloneRegex(entry));
    else throw new TypeError('origin arrays must contain strings or RegExp values');
  }
  const set = strings.length > 8 ? new Set(strings) : undefined;
  return { matches(origin) {
    if (origin === undefined) return false;
    if (set ? set.has(origin) : strings.includes(origin)) return true;
    for (const regex of regexes) if (regexMatches(regex, origin)) return true;
    return false;
  } };
}
function compile(options) {
  if (options == null) options = {};
  if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  const origin = Object.hasOwn(options, 'origin') ? options.origin : '*';
  const methods = own(options, 'methods');
  let allowed = own(options, 'allowedHeaders');
  if (allowed == null) allowed = own(options, 'headers');
  const exposed = own(options, 'exposedHeaders');
  const credentials = own(options, 'credentials');
  const preflightContinue = own(options, 'preflightContinue');
  const status = own(options, 'optionsSuccessStatus');
  const maxAge = own(options, 'maxAge');
  if (status !== undefined && (!Number.isInteger(status) || status < 200 || status > 299)) {
    throw new TypeError('optionsSuccessStatus must be an integer from 200 to 299');
  }
  if (maxAge != null && !((typeof maxAge === 'number' && Number.isSafeInteger(maxAge) && maxAge >= 0) ||
      (typeof maxAge === 'string' && /^\d+$/.test(maxAge) && Number.isSafeInteger(Number(maxAge))))) {
    throw new TypeError('maxAge must be a nonnegative safe integer or decimal string');
  }
  return {
    origin: compileOrigin(origin, true),
    methods: methods === undefined ? defaults : list(methods, 'methods'),
    allowed: list(allowed, 'allowedHeaders'),
    exposed: list(exposed, 'exposedHeaders'),
    credentials: flag(credentials, 'credentials'),
    preflightContinue: flag(preflightContinue, 'preflightContinue'),
    status: status === undefined ? 204 : status,
    maxAge: maxAge == null ? undefined : String(maxAge)
  };
}
function requestOrigin(headers) {
  const origin = headers == null ? undefined : own(headers, 'origin');
  return origin === undefined ? undefined : header(origin, 'request origin');
}
// Every caller supplies one of three fixed, valid field lists. With no current
// header there is nothing to parse or merge. Preserve one read, method receivers,
// and the general vvary contract when a value already exists.
function varyKnown(res, field) {
  const get = res.getHeader, set = res.setHeader;
  if (typeof get !== 'function' || typeof set !== 'function') throw new TypeError('response must provide header methods');
  const value = get.call(res, 'Vary');
  if (value === undefined) return set.call(res, 'Vary', field);
  if (value === field || value === '*') return;
  vary({ getHeader() { return value; }, setHeader(name, next) { return set.call(res, name, next); } }, field);
}
function apply(policy, originPolicy, origin, req, res, dynamic, headers) {
  if (originPolicy === false) {
    if (dynamic) varyKnown(res, 'Origin');
    return true;
  }
  const method = req.method;
  const preflight = typeof method === 'string' && method.toUpperCase() === 'OPTIONS';
  const reflected = originPolicy === true || typeof originPolicy === 'object';
  const allowedOrigin = reflected ? (originPolicy === true || originPolicy.matches(origin) ? origin : undefined) : originPolicy;
  const varyOrigin = dynamic || originPolicy !== '*';
  let allowedHeaders = policy.allowed;
  const reflectHeaders = preflight && allowedHeaders === undefined;
  if (reflectHeaders) {
    allowedHeaders = list(headers == null ? undefined : own(headers, 'access-control-request-headers'), 'request headers');
  }
  // Validate all reflected fields and the existing Vary value before CORS writes.
  if (varyOrigin || reflectHeaders) varyKnown(res, varyOrigin ? (reflectHeaders ? 'Origin, Access-Control-Request-Headers' : 'Origin') : 'Access-Control-Request-Headers');
  if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  if (policy.credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (preflight) {
    if (policy.methods) res.setHeader('Access-Control-Allow-Methods', policy.methods);
    if (allowedHeaders) res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
    if (policy.maxAge !== undefined) res.setHeader('Access-Control-Max-Age', policy.maxAge);
  }
  if (policy.exposed) res.setHeader('Access-Control-Expose-Headers', policy.exposed);
  if (!preflight || policy.preflightContinue) return true;
  for (const name of ['Transfer-Encoding', 'Trailer', 'Content-Encoding']) {
    if (res.getHeader(name) !== undefined) res.removeHeader(name);
  }
  res.statusCode = policy.status;
  res.setHeader('Content-Length', '0');
  res.end();
  return false;
}
function finish(policy, originPolicy, origin, req, res, next, dynamic, headers) {
  let proceed;
  try { proceed = apply(policy, originPolicy, origin, req, res, dynamic, headers); }
  catch (error) { return next(error); }
  if (proceed) return next();
}
// Each provider may settle once. A throw from downstream middleware must escape
// unchanged, while provider throws before settlement are sent to next(error).
function callOnce(provider, argument, receive, next) {
  let called = false, callbackThrew = false, callbackError;
  function callback(error, value) {
    if (called) return;
    called = true;
    try { return receive(error, value); }
    catch (thrown) { callbackThrew = true; callbackError = thrown; throw thrown; }
  }
  try { provider(argument, callback); }
  catch (error) {
    if (callbackThrew && Object.is(error, callbackError)) throw error;
    if (!called) { called = true; return next(error); }
  }
}
function run(policy, req, res, next, dynamic) {
  let origin, headers;
  try {
    if (policy.origin !== false || dynamic) { headers = req.headers; origin = requestOrigin(headers); }
  }
  catch (error) { return next(error); }
  if (typeof policy.origin !== 'function') return finish(policy, policy.origin, origin, req, res, next, dynamic, headers);
  callOnce(policy.origin, origin, (error, value) => {
    if (error) return next(error);
    let compiled;
    try { compiled = compileOrigin(value, false); }
    catch (error) { return next(error); }
    return finish(policy, compiled, origin, req, res, next, true, headers);
  }, next);
}
const defaultPolicy = Object.freeze(compile(undefined));
function cors(options) {
  if (typeof options === 'function') {
    return function corsMiddleware(req, res, next) {
      callOnce(options, req, (error, values) => {
        if (error) return next(error);
        let policy;
        try { policy = compile(values); }
        catch (error) { return next(error); }
        return run(policy, req, res, next, true);
      }, next);
    };
  }
  const policy = options == null ? defaultPolicy : compile(options);
  return function corsMiddleware(req, res, next) { return run(policy, req, res, next, false); };
}
module.exports = Object.freeze(cors);
