'use strict';
const {open} = require('node:fs/promises');
const {constants} = require('node:fs');
const {extname} = require('node:path');
const {createPrivateKey} = require('node:crypto');
const {TextDecoder} = require('node:util');
const {request} = require('vgaxios');
const {sign} = require('vjws');
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const FILE_LIMIT = 1024 * 1024;
const defaultTransporter = Object.freeze({request});
const oauthErrors = new Set(['invalid_request', 'invalid_client', 'invalid_grant', 'unauthorized_client', 'unsupported_grant_type', 'invalid_scope', 'access_denied', 'server_error', 'temporarily_unavailable']);
// Exact public Google diagnostics; never copy an arbitrary server description.
// https://developers.google.com/identity/protocols/oauth2/service-account#error-codes
const oauthDescriptions = new Map([
  ['invalid_grant', new Set(['Invalid JWT Signature.', 'Not a valid email', 'Invalid email or User ID.'])],
  ['invalid_scope', new Set(['Invalid OAuth scope or ID token audience provided.'])],
]);
class TokenError extends Error {
  constructor(code, message, status) { super(message); this.name = 'TokenError'; this.code = code; if (status !== undefined) this.status = status; }
}
const localErrors = new WeakSet();
function failure(code, message) { const error = new TokenError(code, message); localErrors.add(error); return error; }
function safeError(error) {
  if (error instanceof TokenError && localErrors.has(error)) return error;
  // Never retain a transport error: config, cause and response data can contain credentials.
  let status, remote, description;
  try { status = error?.response?.status ?? error?.status; remote = error?.response?.data?.error; } catch { /* Unreadable transport diagnostics are discarded. */ }
  try { description = error?.response?.data?.error_description; } catch { /* Preserve the readable code/status if only the description getter fails. */ }
  const validStatus = Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
  const code = oauthErrors.has(remote) ? remote : 'TOKEN_REQUEST_FAILED';
  const detail = oauthDescriptions.get(code)?.has(description) ? ': ' + description : '';
  return new TokenError(code, 'Token request failed' + (validStatus ? ' (HTTP ' + validStatus + ')' : '') + (code !== 'TOKEN_REQUEST_FAILED' ? ': ' + code : '') + detail, validStatus);
}
function integer(value, name, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw failure('INVALID_OPTIONS', name + ' is outside its supported range');
  return value;
}
function claimsCopy(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure('INVALID_CLAIMS', 'additionalClaims must be an object');
  try {
    const copy = JSON.parse(JSON.stringify(value));
    if (!copy || typeof copy !== 'object' || Array.isArray(copy)) throw 0;
    const freeze = object => { if (object && typeof object === 'object') { for (const child of Object.values(object)) freeze(child); Object.freeze(object); } };
    freeze(copy); return copy;
  } catch { throw failure('INVALID_CLAIMS', 'additionalClaims must be JSON serializable'); }
}
function bounded(work, controller, timeout) {
  return new Promise((resolve, reject) => {
    let timer;
    const deadline = performance.now() + timeout;
    const abort = () => { cleanup(); reject(controller.signal.reason); };
    const cleanup = () => { clearTimeout(timer); controller.signal.removeEventListener('abort', abort); };
    controller.signal.addEventListener('abort', abort, {once: true});
    if (timeout) timer = setTimeout(() => controller.abort(failure('ETIMEDOUT', 'Token operation timed out')), timeout);
    Promise.resolve().then(() => {
      controller.signal.throwIfAborted();
      return work();
    }).then(value => {
      cleanup();
      if (performance.now() >= deadline) {
        controller.abort(failure('ETIMEDOUT', 'Token operation timed out'));
        reject(controller.signal.reason);
      } else resolve(value);
    }, error => { cleanup(); reject(error); });
  });
}
function waitFor(promise, signal) {
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => reject(failure('ABORT_ERR', 'Token operation aborted'));
    signal.addEventListener('abort', abort, {once: true});
    promise.then(value => { signal.removeEventListener('abort', abort); resolve(value); }, error => { signal.removeEventListener('abort', abort); reject(error); });
    if (signal.aborted) abort();
  });
}
function tokenData(data, started) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw failure('INVALID_RESPONSE', 'Invalid token response');
  const result = {};
  for (const name of ['access_token', 'id_token', 'refresh_token', 'token_type', 'scope']) {
    if (!Object.hasOwn(data, name)) continue;
    if (typeof data[name] !== 'string' || !data[name]) throw failure('INVALID_RESPONSE', 'Invalid token response');
    result[name] = data[name];
  }
  if (!result.access_token && !result.id_token) throw failure('INVALID_RESPONSE', 'Token response has no access or ID token');
  let expiresAt;
  if (Object.hasOwn(data, 'expires_in')) {
    const seconds = data.expires_in;
    if (!Number.isSafeInteger(seconds) || seconds < 0 || !Number.isSafeInteger(started + seconds * 1000)) throw failure('INVALID_RESPONSE', 'Invalid token expiry');
    result.expires_in = seconds;
    expiresAt = started + seconds * 1000;
  }
  return {token: Object.freeze(result), expiresAt};
}
class GoogleToken {
  #flight;
  #revoking;
  #cacheConfig;
  #claims;
  #keySource;
  #signingKey;
  constructor(options = {}) {
    if (!options || typeof options !== 'object') throw failure('INVALID_OPTIONS', 'Options must be an object');
    this.key = options.key;
    this.keyFile = options.keyFile;
    this.iss = options.email || options.iss;
    this.sub = options.sub;
    this.scope = Array.isArray(options.scope) ? options.scope.join(' ') : options.scope;
    this.additionalClaims = options.additionalClaims;
    this.eagerRefreshThresholdMillis = integer(options.eagerRefreshThresholdMillis ?? 0, 'eagerRefreshThresholdMillis', 0, Number.MAX_SAFE_INTEGER);
    this.timeout = integer(options.timeout ?? 30000, 'timeout', 1, 2147483647);
    this.maxResponseSize = integer(options.maxResponseSize ?? FILE_LIMIT, 'maxResponseSize', 1, Number.MAX_SAFE_INTEGER);
    this.transporter = options.transporter ?? defaultTransporter;
    if (typeof this.transporter?.request !== 'function') throw failure('INVALID_OPTIONS', 'transporter.request must be a function');
  }
  get additionalClaims() { return this.#claims; }
  set additionalClaims(value) { this.#claims = claimsCopy(value); }
  get accessToken() { return this.rawToken?.access_token; }
  get idToken() { return this.rawToken?.id_token; }
  get tokenType() { return this.rawToken?.token_type; }
  get refreshToken() { return this.rawToken?.refresh_token; }
  hasExpired() { return !this.rawToken || !Number.isFinite(this.expiresAt) || Date.now() >= this.expiresAt; }
  isTokenExpiring() { return !this.rawToken || !Number.isFinite(this.expiresAt) || !Number.isSafeInteger(this.eagerRefreshThresholdMillis) || this.eagerRefreshThresholdMillis < 0 || Date.now() >= this.expiresAt - this.eagerRefreshThresholdMillis; }
  #matches(config) {
    return this.key === config.key && this.keyFile === config.keyFile && this.iss === config.iss && this.sub === config.sub && this.scope === config.scope && this.#claims === config.claims && this.transporter === config.transporter;
  }
  getToken(callback, options) {
    let promise;
    try { promise = this.#get(typeof callback === 'function' ? options : callback); } catch (error) { promise = Promise.reject(safeError(error)); }
    if (typeof callback === 'function') { promise.then(token => callback(null, token), error => callback(error)); return; }
    return promise;
  }
  #get(options = {}) {
    if (!options || typeof options !== 'object' || (options.forceRefresh !== undefined && typeof options.forceRefresh !== 'boolean')) throw failure('INVALID_OPTIONS', 'Invalid token options');
    const signal = options.signal;
    if (signal && (typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function' || typeof signal.aborted !== 'boolean')) throw failure('INVALID_OPTIONS', 'Invalid abort signal');
    if (signal?.aborted) throw failure('ABORT_ERR', 'Token operation aborted');
    if (this.#revoking) return waitFor(this.#revoking, signal).then(() => this.#get({forceRefresh: options.forceRefresh, signal}));
    let flight = this.#flight;
    if (flight && !this.#matches(flight.config)) {
      flight.controller.abort(failure('STALE_CONFIGURATION', 'Token configuration changed'));
      this.#flight = flight = undefined;
    }
    if (!flight) {
      if (!options.forceRefresh && !this.isTokenExpiring() && (!this.#cacheConfig || this.#matches(this.#cacheConfig))) return Promise.resolve(this.rawToken);
      const config = {key: this.key, keyFile: this.keyFile, iss: this.iss, sub: this.sub, scope: this.scope, claims: this.#claims, transporter: this.transporter};
      const timeout = integer(this.timeout, 'timeout', 1, 2147483647);
      flight = {config, controller: new AbortController(), waiters: 0, deadline: performance.now() + timeout};
      this.#flight = flight;
      flight.promise = bounded(() => this.#exchange(flight), flight.controller, timeout).catch(error => {
        if (this.#flight === flight) { this.rawToken = undefined; this.expiresAt = undefined; this.tokenExpires = undefined; }
        throw safeError(error);
      }).finally(() => { if (this.#flight === flight) this.#flight = undefined; });
    }
    flight.waiters++;
    if (!signal) return flight.promise;
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (fn, value) => { if (done) return; done = true; signal.removeEventListener('abort', abort); flight.waiters--; fn(value); };
      const abort = () => {
        const error = failure('ABORT_ERR', 'Token operation aborted');
        finish(reject, error);
        if (flight.waiters === 0 && this.#flight === flight) { this.#flight = undefined; flight.controller.abort(error); }
      };
      signal.addEventListener('abort', abort, {once: true});
      flight.promise.then(value => finish(resolve, value), error => finish(reject, error));
      if (signal.aborted) abort();
    });
  }
  async #exchange(flight) {
    const {config, controller} = flight;
    if (!config.key) {
      if (!config.keyFile) throw failure('MISSING_CREDENTIALS', 'A private key or keyFile is required');
      const credentials = await this.getCredentials(config.keyFile);
      controller.signal.throwIfAborted();
      if (!this.#matches(config)) throw failure('STALE_CONFIGURATION', 'Token configuration changed');
      this.key = config.key = credentials.privateKey;
      this.iss = config.iss = config.iss || credentials.clientEmail;
    }
    const started = Date.now(), iat = Math.floor(started / 1000);
    const payload = {iss: config.iss, scope: config.scope, aud: TOKEN_URL, exp: iat + 3600, iat, sub: config.sub, ...config.claims};
    if (typeof payload.iss !== 'string' || !payload.iss) throw failure('MISSING_CREDENTIALS', 'An issuer email is required');
    if (payload.aud !== TOKEN_URL || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || payload.exp <= payload.iat || payload.exp - payload.iat > 3600 || (payload.scope !== undefined && typeof payload.scope !== 'string') || (payload.sub !== undefined && typeof payload.sub !== 'string')) throw failure('INVALID_CLAIMS', 'Invalid service account assertion claims');
    let assertion;
    try {
      if (this.#keySource !== config.key) {
        const key = createPrivateKey(config.key);
        if (key.asymmetricKeyType !== 'rsa') throw 0;
        this.#signingKey = key; this.#keySource = config.key;
      }
      assertion = sign({header: {alg: 'RS256'}, payload, secret: this.#signingKey});
    } catch { throw failure('INVALID_CREDENTIALS', 'A valid RSA private key is required'); }
    const response = await config.transporter.request(this.#requestOptions(TOKEN_URL, {grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion}, controller.signal));
    controller.signal.throwIfAborted();
    if (this.#flight !== flight || !this.#matches(config)) throw failure('STALE_CONFIGURATION', 'Token configuration changed');
    if (performance.now() >= flight.deadline) throw failure('ETIMEDOUT', 'Token operation timed out');
    const {token, expiresAt} = tokenData(response?.data, started);
    this.rawToken = token; this.expiresAt = expiresAt; this.#cacheConfig = config;
    return token;
  }
  #requestOptions(url, data, signal) {
    return {url, method: 'POST', data, headers: {'Content-Type': 'application/x-www-form-urlencoded'}, responseType: 'json', signal, timeout: this.timeout, maxContentLength: integer(this.maxResponseSize, 'maxResponseSize', 1, Number.MAX_SAFE_INTEGER), maxRedirects: 0, retry: true, retryConfig: {httpMethodsToRetry: ['POST'], totalTimeout: this.timeout}};
  }
  revokeToken(callback) {
    const promise = this.#revoke();
    if (typeof callback === 'function') { promise.then(() => callback(), error => callback(error)); return; }
    return promise;
  }
  #revoke() {
    if (this.#revoking) return this.#revoking;
    if (!this.accessToken) return Promise.reject(failure('MISSING_CREDENTIALS', 'No access token to revoke'));
    const token = this.rawToken;
    if (this.#flight) { this.#flight.controller.abort(failure('TOKEN_REVOKED', 'Token refresh cancelled by revocation')); this.#flight = undefined; }
    const controller = new AbortController();
    let timeout;
    try { timeout = integer(this.timeout, 'timeout', 1, 2147483647); } catch (error) { return Promise.reject(error); }
    this.#revoking = bounded(async () => {
      await this.transporter.request(this.#requestOptions(REVOKE_URL, {token: token.access_token}, controller.signal));
      controller.signal.throwIfAborted();
      if (this.rawToken === token) { this.rawToken = undefined; this.expiresAt = undefined; this.tokenExpires = undefined; this.#cacheConfig = undefined; }
    }, controller, timeout).catch(error => { throw safeError(error); }).finally(() => { this.#revoking = undefined; });
    return this.#revoking;
  }
  async getCredentials(keyFile) {
    const extension = typeof keyFile === 'string' ? extname(keyFile).toLowerCase() : '';
    if (!['.json', '.pem', '.der', '.crt'].includes(extension)) throw failure('UNKNOWN_CERTIFICATE_TYPE', 'Use a JSON service account file or PEM encoded private key');
    let handle;
    try {
      handle = await open(keyFile, constants.O_RDONLY | constants.O_NONBLOCK);
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > FILE_LIMIT) throw 0;
      const buffer = Buffer.alloc(Math.min(stat.size + 1, FILE_LIMIT + 1));
      let length = 0;
      while (length < buffer.length) { const {bytesRead} = await handle.read(buffer, length, buffer.length - length, null); if (!bytesRead) break; length += bytesRead; }
      // The extra byte detects files that grow after stat without an unbounded read.
      if (length > stat.size) throw 0;
      const text = new TextDecoder('utf-8', {fatal: true}).decode(buffer.subarray(0, length));
      if (extension !== '.json') return {privateKey: text};
      const data = JSON.parse(text);
      if (!data || typeof data.private_key !== 'string' || !data.private_key || typeof data.client_email !== 'string' || !data.client_email) throw failure('MISSING_CREDENTIALS', 'Credential file requires private_key and client_email');
      return {privateKey: data.private_key, clientEmail: data.client_email};
    } catch (error) {
      if (error instanceof TokenError) throw error;
      throw failure('INVALID_CREDENTIALS', 'Unable to read a valid credential file (maximum 1 MiB)');
    } finally { if (handle) { try { await handle.close(); } catch { throw failure('INVALID_CREDENTIALS', 'Unable to close credential file'); } } }
  }
}
exports.GoogleToken = GoogleToken;
exports.TokenError = TokenError;
