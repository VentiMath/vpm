'use strict';
const {Readable} = require('node:stream');

function transportError(message, type, code) {
  return Object.assign(new Error(message), {name: 'FetchError', type, ...(code ? {code} : {})});
}
function isStream(body) {
  return !!body && (typeof body.pipe === 'function' || typeof body.getReader === 'function' || typeof body[Symbol.asyncIterator] === 'function');
}
function headersFrom(input) {
  const headers = new Headers(input);
  const cookies = input?.getSetCookie?.() || input?.raw?.()['set-cookie'];
  if (cookies) {headers.delete('set-cookie'); for (const cookie of cookies) headers.append('set-cookie', cookie);}
  return headers;
}
function copyMetadata(target, source) {
  for (const key of ['url', 'redirected', 'type']) if (source[key] !== undefined) Object.defineProperty(target, key, {value: source[key], configurable: true});
  return target;
}
function toWeb(body) {
  if (!body || typeof body.getReader === 'function') return body;
  return Readable.toWeb(body instanceof Readable ? body : Readable.from(body, {objectMode: false}));
}
function boundedBody(body, size, signal) {
  const reader = body.getReader(); let count = 0, ended = false;
  return new ReadableStream({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (signal?.aborted) throw signal.reason;
        if (next.done) {ended = true; reader.releaseLock(); controller.close(); return;}
        count += next.value.byteLength;
        if (size > 0 && count > size) {
          const error = transportError('Response body exceeds configured size limit', 'max-size');
          ended = true; await reader.cancel(error); reader.releaseLock(); controller.error(error); return;
        }
        controller.enqueue(next.value);
      } catch (error) {ended = true; try {reader.releaseLock();} catch {} controller.error(error);}
    },
    async cancel(reason) {if (!ended) {ended = true; try {await reader.cancel(reason);} finally {reader.releaseLock();}}},
  });
}
async function normalizeResponse(response, options) {
  const headers = headersFrom(response.headers);
  const length = headers.get('content-length');
  if (options.method !== 'HEAD' && !headers.has('content-encoding') && options.size > 0 && length !== null && /^\d+$/.test(length) && Number(length) > options.size) {
    if (response.body?.cancel) await response.body.cancel(); else response.body?.destroy?.();
    throw transportError('Response body exceeds configured size limit', 'max-size');
  }
  const bodyless = options.method === 'HEAD' || [204, 205, 304].includes(response.status);
  if (response instanceof Response && !options.size && options.responseType !== 'stream' && !(bodyless && response.body)) return response;
  let body = bodyless ? null : toWeb(response.body);
  if (bodyless && response.body) {if (response.body.cancel) await response.body.cancel(); else response.body.destroy?.();}
  if (body && (options.size > 0 || options.responseType === 'stream')) body = boundedBody(body, options.size, options.signal);
  return copyMetadata(new Response(body, {status: response.status, statusText: response.statusText, headers}), response);
}
async function nativeFetch(input, options) {
  let url = new URL(input), method = options.method || 'GET', body = options.body;
  const headers = headersFrom(options.headers), follow = options.follow ?? 20;
  for (let count = 0;; count++) {
    const init = {method, headers, body, signal: options.signal, redirect: 'manual'};
    for (const key of ['cache','credentials','integrity','keepalive','mode','referrer','referrerPolicy']) if (options[key] !== undefined) init[key] = options[key];
    if (body != null) init.duplex = 'half';
    // Proxy selection is performed by the caller; bypass Bun's independent env lookup.
    if (process.versions.bun) init.proxy = '';
    const response = await globalThis.fetch(url, init);
    const location = response.headers.get('location');
    if (![301,302,303,307,308].includes(response.status) || location === null || options.redirect === 'manual') {
      if (count) Object.defineProperty(response, 'redirected', {value: true, configurable: true});
      return response;
    }
    await response.body?.cancel();
    if (options.redirect === 'error') throw transportError('Redirect mode is set to error', 'no-redirect');
    if (count >= follow) throw transportError('Redirect limit exceeded', 'max-redirect');
    let destination;
    try {destination = new URL(location, url);} catch {throw transportError('Invalid redirect URL', 'invalid-redirect');}
    if (!/^https?:$/.test(destination.protocol) || destination.username || destination.password) throw transportError('Unsupported redirect URL', 'invalid-redirect');
    if (destination.origin !== url.origin) for (const key of ['authorization','proxy-authorization','cookie','cookie2','www-authenticate','host']) headers.delete(key);
    if (response.status === 303 && method !== 'HEAD' || (response.status === 301 || response.status === 302) && method === 'POST') {
      method = 'GET'; body = undefined;
      for (const key of ['content-length','content-type','content-encoding','content-language','content-location']) headers.delete(key);
    } else if (isStream(body)) throw transportError('Cannot replay a streamed redirect body', 'unsupported-redirect');
    url = destination;
  }
}
async function defaultFetch(input, options) {
  const envProxy = !process.versions.bun && (process.env.NODE_USE_ENV_PROXY === '1' || process.execArgv.includes('--use-env-proxy'));
  if (options.agent !== undefined || options.compress === false || envProxy) {
    const init = {...options, timeout: 0}; // The attempt controller owns the full deadline.
    if (typeof FormData !== 'undefined' && init.body instanceof FormData) {
      const encoded = new Request('http://vpm.invalid', {method: 'POST', body: init.body});
      init.body = Readable.fromWeb(encoded.body);
      init.headers = headersFrom(init.headers);
      if (!init.headers.has('content-type')) init.headers.set('content-type', encoded.headers.get('content-type'));
    } else if (init.body?.getReader) init.body = Readable.fromWeb(init.body);
    return require('vnode-fetch')(input, init);
  }
  return nativeFetch(input, options);
}
exports.defaultFetch = defaultFetch;
exports.normalizeResponse = normalizeResponse;
exports.headersFrom = headersFrom;
exports.isStream = isStream;
exports.transportError = transportError;
