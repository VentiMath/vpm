'use strict';
// Based on gcp-metadata 6.1.1. Copyright 2018 Google LLC.
// Licensed under Apache-2.0; see LICENSE. Modified for VPM validation,
// request lifecycle, diagnostics and residency handling.
const transport = require('vgaxios');
const json = require('vjson-bigint')({maxLength: 64 * 1024 * 1024});
const logging = require('vgoogle-logging-utils');
const residency = require('./residency');
const BASE_PATH = '/computeMetadata/v1';
const HOST_ADDRESS = 'http://169.254.169.254';
const SECONDARY_HOST_ADDRESS = 'http://metadata.google.internal.';
const HEADER_NAME = 'Metadata-Flavor', HEADER_VALUE = 'Google';
const HEADERS = Object.freeze({[HEADER_NAME]: HEADER_VALUE});
const METADATA_SERVER_DETECTION = Object.freeze({
  'assume-present': "don't try to ping the metadata server, but assume it's present",
  none: "don't try to ping the metadata server, but don't try to use it either",
  'bios-only': "treat the result of a BIOS probe as canonical (don't fall back to pinging)",
  'ping-only': 'skip the BIOS probe, and go straight to pinging'
});
const allowedOptions = new Set(['property', 'params', 'headers', 'timeout', 'signal', 'maxContentLength']);
const accessorOptions = new Set(['metadataKey', 'params', 'headers', 'noResponseRetries', 'fastFail', 'timeout', 'signal', 'maxContentLength']);
const emptyOptions = Object.freeze({});
let lastHost, lastBase, lastProperty;
const networkCodes = new Set(['EHOSTDOWN', 'EHOSTUNREACH', 'ENETUNREACH', 'ENOENT', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN']);
function integer(value, fallback, minimum, maximum, label) {
  value ??= fallback;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new RangeError('Invalid metadata ' + label);
  return value;
}
function record(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Metadata options must be an object');
  const result = Object.create(null);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      if (key === 'qs') throw new TypeError("'qs' is not a valid configuration option. Please use 'params' instead.");
      throw new TypeError('Unknown metadata configuration option');
    }
    result[key] = value[key];
  }
  return result;
}
function baseUrl(raw) {
  if (!raw) raw = HOST_ADDRESS;
  if (raw === lastHost) return lastBase;
  if (typeof raw !== 'string' || raw.length > 8192 || /[\s\\]/.test(raw)) throw new TypeError('Invalid metadata host');
  let url;
  try { url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : 'http://' + raw); }
  catch { throw new TypeError('Invalid metadata host'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new TypeError('Invalid metadata host');
  lastHost = raw; lastBase = url.origin + BASE_PATH;
  return lastBase;
}
function endpoint(base, key) {
  if (lastProperty !== undefined && key === lastProperty) return base + '/' + key;
  if (typeof key !== 'string' || !key || key.length > 8192 || key.startsWith('/') || /[\x00-\x20\x7f\\#]/.test(key)) throw new TypeError('Invalid metadata property');
  const path = key.split('?', 1)[0];
  for (const part of path.split('/')) {
    let decoded; try { decoded = decodeURIComponent(part); } catch { throw new TypeError('Invalid metadata property'); }
    if (decoded === '.' || decoded === '..' || /[\/\\\x00-\x20\x7f]/.test(decoded)) throw new TypeError('Invalid metadata property');
  }
  lastProperty = key;
  return base + '/' + key;
}
function headers(input) {
  const result = Object.create(null);
  if (input !== undefined) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Invalid metadata headers');
    for (const name of Object.keys(input)) {
      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) throw new TypeError('Invalid metadata headers');
      const key = name.toLowerCase(), value = input[name];
      if (key === 'host' || (key === 'metadata-flavor' && value !== HEADER_VALUE)) throw new TypeError('Cannot override metadata routing headers');
      if (value === undefined) continue;
      const values = Array.isArray(value) ? value.slice() : [value];
      for (const item of values) if (!['string', 'number'].includes(typeof item) || /[^\t\x20-\x7e\x80-\xff]/.test(String(item))) throw new TypeError('Invalid metadata headers');
      result[key] = Array.isArray(value) ? values : value;
    }
  }
  result['metadata-flavor'] = HEADER_VALUE;
  return result;
}
function parameters(input) {
  if (input === undefined) return undefined;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Invalid metadata params');
  const result = Object.create(null);
  for (const key of Object.keys(input)) {
    const value = input[key];
    if (typeof value !== 'string') throw new TypeError('Metadata params must contain strings');
    result[key] = value;
  }
  return result;
}
function requestTimeout() { return 3000; }
function prepare(key, options, retries = 3, fastFail = false) {
  const primary = baseUrl(process.env.GCE_METADATA_IP || process.env.GCE_METADATA_HOST);
  const url = endpoint(primary, key);
  const signal = options.signal;
  if (signal !== undefined && (!signal || typeof signal.aborted !== 'boolean' || typeof signal.addEventListener !== 'function' || typeof signal.removeEventListener !== 'function')) throw new TypeError('Invalid metadata signal');
  if (typeof fastFail !== 'boolean') throw new TypeError('Invalid metadata fastFail option');
  return {
    url, secondary: fastFail && !process.env.GCE_METADATA_IP && !process.env.GCE_METADATA_HOST ? endpoint(baseUrl(SECONDARY_HOST_ADDRESS), key) : undefined,
    headers: headers(options.headers), params: parameters(options.params), signal,
    timeout: integer(options.timeout, requestTimeout(), 1, 3600000, 'timeout'),
    maxContentLength: integer(options.maxContentLength, 16 * 1024 * 1024, 1, 64 * 1024 * 1024, 'maxContentLength'),
    retries: integer(retries, 3, 0, 10, 'retry count')
  };
}
function safeError(error, forcedCode) {
  const status = error?.response?.status ?? error?.status;
  const validStatus = Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
  const code = forcedCode || (error?.code === 'TimeoutError' ? 'ETIMEDOUT' : networkCodes.has(error?.code) ? error.code : 'ERR_METADATA_REQUEST');
  const result = new transport.GaxiosError('Metadata request failed' + (validStatus ? ' (HTTP ' + validStatus + ')' : ''), {}, validStatus ? {status: validStatus, statusText: '', headers: {}, config: {}, data: ''} : undefined);
  result.code = code;
  return result;
}
function shouldRetry(error) {
  const status = error.response?.status;
  if (status !== undefined) return (status >= 100 && status < 200) || status === 408 || status === 429 || (status >= 500 && status < 600);
  // Redirect refusal, body limits and TLS validation cannot be repaired by retrying.
  return networkCodes.has(error.code || error.error?.code);
}
function decode(data) {
  if (typeof data !== 'string') return data;
  // Most scalar metadata is plain text; avoid throwing merely to recognize it.
  if (!/^[\x20\t\r\n]*(?:[\[{"\-0-9]|(?:true|false|null)[\x20\t\r\n]*$)/.test(data)) return data;
  try { return json.parse(data); } catch (error) { if (error instanceof SyntaxError) return data; throw error; }
}
async function retrieve(config) {
  const controller = new AbortController();
  let timeout, timedOut = false, canceled = false, completed = false;
  const cancel = () => { canceled = true; controller.abort(); };
  if (config.signal?.aborted) throw safeError(undefined, 'ERR_CANCELED');
  config.signal?.addEventListener('abort', cancel, {once: true});
  timeout = setTimeout(() => { timedOut = true; controller.abort(); }, config.timeout);
  try {
    logging.log('gcp metadata').info('Metadata request started');
    const options = {headers: config.headers, params: config.params, responseType: 'text', timeout: config.timeout,
      maxContentLength: config.maxContentLength, maxRedirects: 0, noProxy: ['*'], signal: controller.signal,
      retryConfig: {noResponseRetries: config.retries, retry: 3, totalTimeout: config.timeout, shouldRetry}};
    async function send(url) {
      const response = await transport.request({...options, url});
      if ((response.headers?.get?.('metadata-flavor') ?? response.headers?.['metadata-flavor']) !== HEADER_VALUE) throw safeError(undefined, 'ERR_METADATA_FLAVOR');
      return response;
    }
    let response;
    if (config.secondary) {
      // A quick DNS failure must not hide a working IP endpoint (or vice versa).
      try { response = await Promise.any([send(config.url), send(config.secondary)]); }
      catch (aggregate) { throw aggregate.errors?.[0] || aggregate; }
      controller.abort();
    } else response = await send(config.url);
    completed = true;
    const data = decode(response.data);
    logging.log('gcp metadata').info('Metadata request completed');
    return data;
  } catch (error) {
    throw safeError(error, timedOut ? 'ETIMEDOUT' : canceled ? 'ERR_CANCELED' : error?.code === 'ERR_METADATA_FLAVOR' ? error.code : undefined);
  } finally {
    clearTimeout(timeout);
    config.signal?.removeEventListener('abort', cancel);
    if (!completed) controller.abort();
  }
}
async function access(type, options) {
  let key = type;
  if (options === undefined) options = emptyOptions;
  else if (typeof options === 'string') { if (options) key += '/' + options; options = emptyOptions; }
  else { options = record(options, allowedOptions); if (options.property !== undefined) { if (typeof options.property !== 'string') throw new TypeError('Invalid metadata property'); if (options.property) key += '/' + options.property; } }
  return retrieve(prepare(key, options));
}
function instance(options) { return access('instance', options); }
function project(options) { return access('project', options); }
function universe(options) { return access('universe', options); }
async function bulk(properties) {
  if (!Array.isArray(properties) || properties.length > 1024) throw new TypeError('Metadata bulk requires at most 1024 accessors');
  const seen = new Set();
  // Validate and snapshot every entry before starting any network operation.
  const entries = Array.from(properties, item => {
    const options = record(item, accessorOptions), key = options.metadataKey;
    if (seen.has(key)) throw new TypeError('Duplicate metadata bulk key'); seen.add(key);
    return {key, config: prepare(key, options, options.noResponseRetries, options.fastFail ?? false)};
  });
  const result = Object.create(null); let cursor = 0, failed = false;
  await Promise.all(Array.from({length: Math.min(16, entries.length)}, async () => {
    while (!failed && cursor < entries.length) {
      const {key, config} = entries[cursor++];
      try { result[key] = await retrieve(config); } catch (error) { failed = true; throw error; }
    }
  }));
  return result;
}
let available;
function detectionRetries() {
  const value = process.env.DETECT_GCP_RETRIES;
  if (value === undefined || value === '') return 0;
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) throw new RangeError('Invalid metadata detection retry count');
  return integer(Number(value), 0, 0, 10, 'detection retry count');
}
async function isAvailable() {
  const mode = process.env.METADATA_SERVER_DETECTION?.trim().toLowerCase();
  if (mode && !Object.hasOwn(METADATA_SERVER_DETECTION, mode)) throw new RangeError('Unknown METADATA_SERVER_DETECTION value');
  if (mode === 'assume-present') return true;
  if (mode === 'none') return false;
  if (mode === 'bios-only') return getGCPResidency();
  const ip = process.env.GCE_METADATA_IP, host = process.env.GCE_METADATA_HOST, retrySetting = process.env.DETECT_GCP_RETRIES;
  if (!available || available.ip !== ip || available.host !== host || available.mode !== mode || available.retrySetting !== retrySetting) {
    const retries = detectionRetries();
    const promise = (async () => {
      try { await retrieve(prepare('instance', {}, retries, true)); return true; }
      catch (error) {
        if (process.env.DEBUG_AUTH) console.info(new Error('Metadata detection failed'));
        if (!networkCodes.has(error.code) && error.status !== 404 && error.code !== 'ERR_CANCELED') process.emitWarning('Metadata detection received unexpected error', 'MetadataLookupWarning');
        return false;
      }
    })();
    available = {ip, host, mode, retrySetting, promise};
  }
  return available.promise;
}
function resetIsAvailableCache() { available = undefined; }
function getGCPResidency() {
  if (exports.gcpResidencyCache === null) setGCPResidency();
  return exports.gcpResidencyCache;
}
function setGCPResidency(value = null) {
  if (value !== null && typeof value !== 'boolean') throw new TypeError('GCP residency must be a boolean or null');
  exports.gcpResidencyCache = value === null ? residency.detectGCPResidency() : value;
}
exports.BASE_PATH = BASE_PATH;
exports.HOST_ADDRESS = HOST_ADDRESS;
exports.SECONDARY_HOST_ADDRESS = SECONDARY_HOST_ADDRESS;
exports.HEADER_NAME = HEADER_NAME;
exports.HEADER_VALUE = HEADER_VALUE;
exports.HEADERS = HEADERS;
exports.METADATA_SERVER_DETECTION = METADATA_SERVER_DETECTION;
exports.instance = instance;
exports.project = project;
exports.universe = universe;
exports.bulk = bulk;
exports.isAvailable = isAvailable;
exports.resetIsAvailableCache = resetIsAvailableCache;
exports.gcpResidencyCache = null;
exports.getGCPResidency = getGCPResidency;
exports.setGCPResidency = setGCPResidency;
exports.requestTimeout = requestTimeout;
exports.GCE_LINUX_BIOS_PATHS = residency.GCE_LINUX_BIOS_PATHS;
exports.isGoogleCloudServerless = residency.isGoogleCloudServerless;
exports.isGoogleComputeEngineLinux = residency.isGoogleComputeEngineLinux;
exports.isGoogleComputeEngineMACAddress = residency.isGoogleComputeEngineMACAddress;
exports.isGoogleComputeEngine = residency.isGoogleComputeEngine;
exports.detectGCPResidency = residency.detectGCPResidency;
