'use strict';
// Adapted from gaxios 8.3.2. Copyright Google LLC; Apache-2.0.
const extend = require('vextend');
const {Agent} = require('node:https');
const {Readable} = require('node:stream');
const {randomUUID} = require('node:crypto');
const {GaxiosError, defaultErrorRedactor, snapshotOptions} = require('./common');
const {getRetryConfig, validateRetryConfig} = require('./retry');
const {GaxiosInterceptorManager} = require('./interceptor');
const {defaultFetch, normalizeResponse, headersFrom, isStream} = require('./transport');
const abortError = signal => signal?.reason instanceof Error ? signal.reason : Object.assign(new Error(signal?.reason === undefined ? 'Request aborted' : String(signal.reason)), {name: 'AbortError', code: 'AbortError'});

class Gaxios {
  constructor(defaults = {}) {
    this.defaults = snapshotOptions(defaults);
    this.agentCache = new Map();
    this.interceptors = {request: new GaxiosInterceptorManager(), response: new GaxiosInterceptorManager()};
  }
  static mergeHeaders(base, ...append) {
    base = base instanceof Headers ? base : headersFrom(base);
    for (const input of append) {
      if (input == null) continue;
      const add = headersFrom(input);
      for (const [key, value] of add) if (key !== 'set-cookie') base.set(key, value);
      for (const cookie of add.getSetCookie()) base.append('set-cookie', cookie);
    }
    return base;
  }
  fetch(input, init = {}) {
    if (input instanceof Request) {
      if (input.bodyUsed) return Promise.reject(new TypeError('Request body has already been consumed'));
      const options = {};
      for (const key of ['method','body','signal','cache','credentials','integrity','keepalive','mode','redirect','referrer','referrerPolicy']) options[key] = input[key];
      return this.request({...options, ...init, url: input.url, headers: Gaxios.mergeHeaders(new Headers(input.headers), init.headers)});
    }
    if (input && typeof input === 'object' && !(input instanceof URL)) {
      return this.request({...input, ...init, headers: Gaxios.mergeHeaders(undefined, input.headers, init.headers)});
    }
    return this.request({...init, url: input});
  }
  async request(options = {}) {
    if (options instanceof Request) return this.fetch(options);
    let prepared = this.#prepareRequest(options);
    for (const interceptor of this.interceptors.request) if (interceptor) prepared = prepared.then(interceptor.resolved, interceptor.rejected);
    let response = prepared.then(opts => this._request(opts));
    for (const interceptor of this.interceptors.response) if (interceptor) response = response.then(interceptor.resolved, interceptor.rejected);
    return response;
  }
  destroy() {for (const agent of this.agentCache.values()) agent.destroy(); this.agentCache.clear();}
  async _defaultAdapter(opts) {
    const {data: unused, ...init} = opts;
    const raw = await (opts.fetchImplementation || defaultFetch)(opts.url, init);
    const response = await normalizeResponse(raw, opts);
    let data;
    if (response.status === 204) data = '';
    else if (opts.responseType === 'stream') data = opts.fetchImplementation && raw.body?.getReader ? response.body : response.body ? Readable.fromWeb(response.body) : Readable.from([]);
    else if (opts.responseType === 'arraybuffer') data = await response.arrayBuffer();
    else if (opts.responseType === 'blob') data = await response.blob();
    else {
      const type = response.headers.get('content-type')?.toLowerCase() || '';
      if (opts.responseType === 'json' || type.includes('application/json') && opts.responseType !== 'text') {
        data = await response.text(); try {data = JSON.parse(data);} catch {}
      } else if (opts.responseType === 'text' || !type || type.startsWith('text/')) data = await response.text();
      else data = await response.blob();
    }
    return Object.assign(response, {config: opts, data});
  }
  async _request(opts) {
    let configuredTimeout = opts.timeout;
    for (;;) {
      let timer, removeAbort = () => {}, retained = false;
      const controller = new AbortController();
      const cleanup = () => {clearTimeout(timer); removeAbort();};
      try {
        if (opts.signal?.aborted) {controller.abort(abortError(opts.signal)); throw controller.signal.reason;}
        let timeout = configuredTimeout || 0;
        if (opts.retryConfig?.totalTimeout !== undefined) {
          const remaining = opts.retryConfig.totalTimeout - (Date.now() - opts.retryConfig.timeOfFirstRequest);
          if (remaining <= 0) throw Object.assign(new Error('Retry budget exhausted'), {code: 'ETIMEDOUT'});
          timeout = Math.min(timeout || 2147483647, Math.ceil(remaining), 2147483647);
        }
        if (opts.signal) {
          const abort = () => controller.abort(abortError(opts.signal));
          opts.signal.addEventListener('abort', abort, {once: true});
          removeAbort = () => opts.signal.removeEventListener('abort', abort);
          if (opts.signal.aborted) abort();
        }
        if (timeout) {
          timer = setTimeout(() => controller.abort(new DOMException('The operation timed out', 'TimeoutError')), timeout);
          timer.unref?.();
        }
        const attempt = {...opts, signal: controller.signal, timeout};
        const response = await (opts.adapter ? opts.adapter(attempt, this._defaultAdapter.bind(this)) : this._defaultAdapter(attempt));
        if (controller.signal.aborted) throw controller.signal.reason;
        if (!opts.validateStatus(response.status)) {
          if (opts.responseType === 'stream') {
            try {
              const body = response.data?.getReader ? Readable.fromWeb(response.data) : response.data;
              response.data = await new (require('vnode-fetch').Response)(body, {size: opts.size, timeout}).text();
            } catch (error) {throw new GaxiosError('Unable to read error response', attempt, response, error);}
          }
          const cause = GaxiosError.extractAPIErrorFromResponse(response, `Request failed with status code ${response.status}`);
          throw new GaxiosError(cause.message, attempt, response, cause);
        }
        if (opts.responseType === 'stream' && response.data?.once) {
          const stream = response.data;
          const done = () => {cleanup(); stream.removeListener('end', done); stream.removeListener('close', done); stream.removeListener('error', done);};
          stream.once('end', done); stream.once('close', done); stream.once('error', done);
          retained = true;
          if (stream.destroyed || stream.readableEnded) done();
        }
        if (opts.responseType === 'stream' && response.data?.getReader) {
          const reader = response.data.getReader(), controllerSignal = controller.signal;
          response.data = new ReadableStream({
            async pull(controller) {
              try {const next = await reader.read(); if (controllerSignal.aborted) throw controllerSignal.reason; if (next.done) {cleanup(); reader.releaseLock(); controller.close();} else controller.enqueue(next.value);}
              catch (error) {cleanup(); try {reader.releaseLock();} catch {} controller.error(error);}
            },
            async cancel(reason) {try {await reader.cancel(reason);} finally {cleanup(); reader.releaseLock();}},
          });
          retained = true;
        }
        return response;
      } catch (error) {
        cleanup();
        const err = error instanceof GaxiosError ? error : new GaxiosError(error?.message || 'Unexpected Gaxios Error', {...opts, signal: controller.signal}, undefined, error);
        if (controller.signal.aborted && controller.signal.reason?.name === 'TimeoutError') {
          err.code = 'TimeoutError'; err.message = 'The operation timed out';
        } else if (opts.signal?.aborted) err.code = 'AbortError';
        // Backoff and subsequent attempts observe the caller, not an expired attempt signal.
        let decision;
        try {decision = await getRetryConfig(err, opts.signal);} catch (cause) {const failed = new GaxiosError(cause.message, opts, undefined, cause); if (opts.errorRedactor) opts.errorRedactor(failed); throw failed;}
        if (decision.shouldRetry) {configuredTimeout = decision.config.timeout ?? configuredTimeout; opts = {...decision.config, signal: opts.signal}; continue;}
        if (opts.errorRedactor) opts.errorRedactor(err);
        throw err;
      } finally {if (!retained) cleanup();}
    }
  }
  #urlMayUseProxy(url, rules = []) {
    for (const rule of [...rules, ...(process.env.NO_PROXY ?? process.env.no_proxy ?? '').split(',').map(x => x.trim())]) {
      if (rule instanceof RegExp) {const index = rule.lastIndex; try {rule.lastIndex = 0; if (rule.test(url.href)) return false;} finally {rule.lastIndex = index;}}
      else if (rule instanceof URL) {if (rule.origin === url.origin) return false;}
      else if (typeof rule === 'string') {
        if (rule === '*' || [url.origin,url.hostname,url.host,url.href].includes(rule)) return false;
        if ((rule.startsWith('*.') || rule.startsWith('.')) && url.hostname.endsWith(rule.replace(/^\*\./, '.'))) return false;
      }
    }
    return true;
  }
  async #prepareRequest(options) {
    const opts = extend(true, {}, this.defaults, options);
    if (!opts.url) throw new Error('URL is required.');
    opts.url = new URL(opts.url, opts.baseURL || opts.baseUrl);
    if (!/^https?:$/.test(opts.url.protocol) || opts.url.username || opts.url.password) throw new TypeError('Expected an HTTP(S) URL without embedded credentials');
    opts.headers = Gaxios.mergeHeaders(undefined, this.defaults.headers, options.headers);
    if (opts.params) {
      if (opts.paramsSerializer) {
        const query = opts.paramsSerializer(opts.params).replace(/^\?/, '');
        opts.url.search += (opts.url.search ? '&' : '') + query;
      } else for (const [key, value] of new URLSearchParams(opts.params)) opts.url.searchParams.append(key, value);
    }
    if (opts.maxContentLength !== undefined) opts.size = opts.maxContentLength;
    if (opts.maxRedirects !== undefined) opts.follow = opts.maxRedirects;
    for (const key of ['size','follow']) if (opts[key] !== undefined && (!Number.isSafeInteger(opts[key]) || opts[key] < 0)) throw new RangeError(key + ' must be a nonnegative safe integer');
    if (opts.timeout !== undefined && (!Number.isInteger(opts.timeout) || opts.timeout < 0 || opts.timeout > 2147483647)) throw new RangeError('Invalid timeout');
    if (opts.redirect !== undefined && !['follow','manual','error'].includes(opts.redirect)) throw new TypeError('Invalid redirect mode');
    if (opts.retry || opts.retryConfig) {opts.retryConfig ||= {}; validateRetryConfig(opts.retryConfig); opts.retryConfig.timeOfFirstRequest ??= Date.now();}
    if (opts.multipart?.length) {
      const parts = opts.multipart.map(part => ({headers: headersFrom(part.headers), content: part.content}));
      const boundary = randomUUID();
      opts.headers.set('content-type', `multipart/related; boundary=${boundary}`);
      opts.body = Readable.from(this.getMultipartRequest(parts, boundary), {objectMode: false});
    } else if (opts.data !== undefined) {
      const data = opts.data;
      if (typeof data === 'string' || data instanceof String || data instanceof ArrayBuffer || ArrayBuffer.isView(data) || isStream(data) || data instanceof Blob || data instanceof FormData || data instanceof URLSearchParams) opts.body = data;
      else if (opts.headers.get('content-type') === 'application/x-www-form-urlencoded' && data !== null && typeof data === 'object') opts.body = opts.paramsSerializer ? opts.paramsSerializer(data) : new URLSearchParams(data);
      else {if (!opts.headers.has('content-type')) opts.headers.set('content-type', 'application/json'); opts.body = JSON.stringify(data);}
    }
    opts.validateStatus ||= status => status >= 200 && status < 300;
    opts.responseType ||= 'unknown';
    opts.method = (opts.method || 'GET').toUpperCase();
    if (!opts.headers.has('accept') && opts.responseType === 'json') opts.headers.set('accept', 'application/json');
    const proxy = opts.proxy || process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
    if (opts.agent === undefined && proxy && this.#urlMayUseProxy(opts.url, opts.noProxy)) {
      const cacheKey = JSON.stringify(['proxy', proxy.toString(), opts.cert || null, opts.key || null]);
      if (!this.agentCache.has(cacheKey)) {
        const {HttpsProxyAgent} = require('vhttps-proxy-agent');
        const tls = opts.cert && opts.key ? {cert: opts.cert, key: opts.key} : {};
        class DestinationAgent extends HttpsProxyAgent {connect(request, options) {return super.connect(request, {...options, ...tls});}}
        this.agentCache.set(cacheKey, new DestinationAgent(proxy));
      }
      opts.agent = this.agentCache.get(cacheKey);
    } else if (opts.agent === undefined && opts.cert && opts.key) {
      const key = JSON.stringify(['tls', opts.cert, opts.key]);
      if (!this.agentCache.has(key)) this.agentCache.set(key, new Agent({cert: opts.cert, key: opts.key}));
      opts.agent = this.agentCache.get(key);
    }
    if (opts.body != null && !('duplex' in opts)) opts.duplex = 'half';
    if (typeof opts.errorRedactor !== 'function' && opts.errorRedactor !== false) opts.errorRedactor = defaultErrorRedactor;
    return opts;
  }
  async *getMultipartRequest(parts, boundary) {
    for (const part of parts) {
      yield `--${boundary}\r\nContent-Type: ${part.headers.get('content-type') || 'application/octet-stream'}\r\n\r\n`;
      if (typeof part.content === 'string' || ArrayBuffer.isView(part.content)) yield part.content;
      else yield* part.content;
      yield '\r\n';
    }
    yield `--${boundary}--`;
  }
}
exports.Gaxios = Gaxios;
