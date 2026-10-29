"use strict";
// Copyright 2018 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _Gaxios_instances, _a, _Gaxios_urlMayUseProxy, _Gaxios_applyRequestInterceptors, _Gaxios_applyResponseInterceptors, _Gaxios_prepareRequest, _Gaxios_proxyAgent, _Gaxios_getProxyAgent;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gaxios = void 0;
const extend_1 = __importDefault(require("vextend"));
const https_1 = require("https");
const node_fetch_1 = __importDefault(require("vnode-fetch"));
const querystring_1 = __importDefault(require("querystring"));
const is_stream_1 = __importDefault(require("vis-stream"));
const url_1 = require("url");
const common_1 = require("./common");
const retry_1 = require("./retry");
const stream_1 = require("stream");
const {randomUUID} = require("node:crypto");
const {validateHeaderValue} = require("node:http");
const interceptor_1 = require("./interceptor");
/* eslint-disable @typescript-eslint/no-explicit-any */
const fetch = hasFetch() ? window.fetch : node_fetch_1.default;
function hasWindow() {
    return typeof window !== 'undefined' && !!window;
}
function hasFetch() {
    return hasWindow() && !!window.fetch;
}
function hasBuffer() {
    return typeof Buffer !== 'undefined';
}
function hasHeader(options, header) {
    return !!getHeader(options, header);
}
function getHeader(options, header) {
    header = header.toLowerCase();
    for (const key of Object.keys((options === null || options === void 0 ? void 0 : options.headers) || {})) {
        if (header === key.toLowerCase()) {
            return options.headers[key];
        }
    }
    return undefined;
}
class Gaxios {
    /**
     * The Gaxios class is responsible for making HTTP requests.
     * @param defaults The default set of options to be used for this instance.
     */
    constructor(defaults) {
        _Gaxios_instances.add(this);
        this.agentCache = new Map();
        this.defaults = (0, extend_1.default)(true, {}, defaults || {});
        this.interceptors = {
            request: new interceptor_1.GaxiosInterceptorManager(),
            response: new interceptor_1.GaxiosInterceptorManager(),
        };
    }
    /**
     * Perform an HTTP request with the given options.
     * @param opts Set of HTTP options that will be used for this HTTP request.
     */
    async request(opts = {}) {
        opts = await __classPrivateFieldGet(this, _Gaxios_instances, "m", _Gaxios_prepareRequest).call(this, opts);
        opts = await __classPrivateFieldGet(this, _Gaxios_instances, "m", _Gaxios_applyRequestInterceptors).call(this, opts);
        return __classPrivateFieldGet(this, _Gaxios_instances, "m", _Gaxios_applyResponseInterceptors).call(this, this._request(opts));
    }
    async _defaultAdapter(opts) {
        const fetchImpl = opts.fetchImplementation || fetch;
        const res = (await fetchImpl(opts.url, opts));
        const data = await this.getResponseData(opts, res);
        return this.translateResponse(opts, res, data);
    }
    /**
     * Internal, retryable version of the `request` method.
     * @param opts Set of HTTP options that will be used for this HTTP request.
     */
    destroy() {
        for (const agent of this.agentCache.values()) agent.destroy();
        this.agentCache.clear();
    }
    async _request(opts = {}) {
        var _b;
        try {
            if (opts.signal?.aborted) throw new node_fetch_1.default.AbortError('Request aborted');
            const budget = opts.retryConfig;
            if (budget?.totalTimeout !== undefined && budget.totalTimeout < Number.MAX_SAFE_INTEGER) {
                const remaining = budget.totalTimeout - (Date.now() - budget.timeOfFirstRequest);
                if (remaining <= 0) throw Object.assign(new Error('Retry budget exhausted'), {code: 'ETIMEDOUT'});
                opts.timeout = Math.min(opts.timeout || 2147483647, Math.ceil(remaining), 2147483647);
            }
            let translatedResponse;
            if (opts.adapter) {
                translatedResponse = await opts.adapter(opts, this._defaultAdapter.bind(this));
            }
            else {
                translatedResponse = await this._defaultAdapter(opts);
            }
            if (!opts.validateStatus(translatedResponse.status)) {
                if (opts.responseType === 'stream') {
                    try {
                        translatedResponse.data = await new node_fetch_1.default.Response(translatedResponse.data, {size: opts.size, timeout: opts.timeout}).text();
                    } catch (error) {
                        throw new common_1.GaxiosError('Unable to read error response', opts, translatedResponse, error);
                    }
                }
                throw new common_1.GaxiosError(`Request failed with status code ${translatedResponse.status}`, opts, translatedResponse);
            }
            return translatedResponse;
        }
        catch (e) {
            const err = e instanceof common_1.GaxiosError
                ? e
                : new common_1.GaxiosError(e.message, opts, undefined, e);
            let decision;
            try { decision = await (0, retry_1.getRetryConfig)(err); }
            catch (error) { throw new common_1.GaxiosError(error.message, opts, undefined, error); }
            const {shouldRetry, config} = decision;
            if (shouldRetry && config) {
                err.config.retryConfig.currentRetryAttempt =
                    config.retryConfig.currentRetryAttempt;
                // The error's config could be redacted - therefore we only want to
                // copy the retry state over to the existing config
                opts.retryConfig = (_b = err.config) === null || _b === void 0 ? void 0 : _b.retryConfig;
                return this._request(opts);
            }
            throw err;
        }
    }
    async getResponseData(opts, res) {
        switch (opts.responseType) {
            case 'stream':
                return res.body;
            case 'json': {
                let data = await res.text();
                try {
                    data = JSON.parse(data);
                }
                catch (_b) {
                    // continue
                }
                return data;
            }
            case 'arraybuffer':
                return res.arrayBuffer();
            case 'blob':
                return res.blob();
            case 'text':
                return res.text();
            default:
                return this.getResponseDataFromContentType(res);
        }
    }
    /**
     * By default, throw for any non-2xx status code
     * @param status status code from the HTTP response
     */
    validateStatus(status) {
        return status >= 200 && status < 300;
    }
    /**
     * Encode a set of key/value pars into a querystring format (?foo=bar&baz=boo)
     * @param params key value pars to encode
     */
    paramsSerializer(params) {
        return querystring_1.default.stringify(params);
    }
    translateResponse(opts, res, data) {
        // headers need to be converted from a map to an obj
        const headers = {};
        res.headers.forEach((value, key) => {
            headers[key] = value;
        });
        return {
            config: opts,
            data: data,
            headers,
            status: res.status,
            statusText: res.statusText,
            // XMLHttpRequestLike
            request: {
                responseURL: res.url,
            },
        };
    }
    /**
     * Attempts to parse a response by looking at the Content-Type header.
     * @param {FetchResponse} response the HTTP response.
     * @returns {Promise<any>} a promise that resolves to the response data.
     */
    async getResponseDataFromContentType(response) {
        let contentType = response.headers.get('Content-Type');
        if (contentType === null) {
            // Maintain existing functionality by calling text()
            return response.text();
        }
        contentType = contentType.toLowerCase();
        if (contentType.includes('application/json')) {
            let data = await response.text();
            try {
                data = JSON.parse(data);
            }
            catch (_b) {
                // continue
            }
            return data;
        }
        else if (contentType.match(/^text\//)) {
            return response.text();
        }
        else {
            // If the content type is something not easily handled, just return the raw data (blob)
            return response.blob();
        }
    }
    /**
     * Creates an async generator that yields the pieces of a multipart/related request body.
     * This implementation follows the spec: https://www.ietf.org/rfc/rfc2387.txt. However, recursive
     * multipart/related requests are not currently supported.
     *
     * @param {GaxioMultipartOptions[]} multipartOptions the pieces to turn into a multipart/related body.
     * @param {string} boundary the boundary string to be placed between each part.
     */
    async *getMultipartRequest(multipartOptions, boundary) {
        const finale = `--${boundary}--`;
        for (const currentPart of multipartOptions) {
            const key = Object.keys(currentPart.headers || {}).find(key => key.toLowerCase() === 'content-type');
            const partContentType = key ? currentPart.headers[key] : 'application/octet-stream';
            const preamble = `--${boundary}\r\nContent-Type: ${partContentType}\r\n\r\n`;
            yield preamble;
            if (typeof currentPart.content === 'string' || Buffer.isBuffer(currentPart.content) || currentPart.content instanceof Uint8Array) {
                yield currentPart.content;
            }
            else {
                yield* currentPart.content;
            }
            yield '\r\n';
        }
        yield finale;
    }
}
exports.Gaxios = Gaxios;
_a = Gaxios, _Gaxios_instances = new WeakSet(), _Gaxios_urlMayUseProxy = function _Gaxios_urlMayUseProxy(url, noProxy = []) {
    var _b, _c;
    const candidate = new url_1.URL(url);
    const noProxyList = [...noProxy];
    const noProxyEnvList = ((_c = ((_b = process.env.NO_PROXY) !== null && _b !== void 0 ? _b : process.env.no_proxy)) === null || _c === void 0 ? void 0 : _c.split(',')) || [];
    for (const rule of noProxyEnvList) {
        noProxyList.push(rule.trim());
    }
    for (const rule of noProxyList) {
        // Match regex
        if (rule instanceof RegExp) {
            const previous = rule.lastIndex;
            let matches;
            try { rule.lastIndex = 0; matches = rule.test(candidate.toString()); } finally { rule.lastIndex = previous; }
            if (matches) return false;
        }
        // Match URL
        else if (rule instanceof url_1.URL) {
            if (rule.origin === candidate.origin) {
                return false;
            }
        }
        // Match string regex
        else if (rule === '*') return false;
        else if (typeof rule === 'string' && (rule.startsWith('*.') || rule.startsWith('.'))) {
            const cleanedRule = rule.replace(/^\*\./, '.');
            if (candidate.hostname.endsWith(cleanedRule)) {
                return false;
            }
        }
        // Basic string match
        else if (rule === candidate.origin ||
            rule === candidate.hostname || rule === candidate.host ||
            rule === candidate.href) {
            return false;
        }
    }
    return true;
}, _Gaxios_applyRequestInterceptors =
/**
 * Applies the request interceptors. The request interceptors are applied after the
 * call to prepareRequest is completed.
 *
 * @param {GaxiosOptions} options The current set of options.
 *
 * @returns {Promise<GaxiosOptions>} Promise that resolves to the set of options or response after interceptors are applied.
 */
async function _Gaxios_applyRequestInterceptors(options) {
    let promiseChain = Promise.resolve(options);
    for (const interceptor of this.interceptors.request.values()) {
        if (interceptor) {
            promiseChain = promiseChain.then(interceptor.resolved, interceptor.rejected);
        }
    }
    return promiseChain;
}, _Gaxios_applyResponseInterceptors =
/**
 * Applies the response interceptors. The response interceptors are applied after the
 * call to request is made.
 *
 * @param {GaxiosOptions} options The current set of options.
 *
 * @returns {Promise<GaxiosOptions>} Promise that resolves to the set of options or response after interceptors are applied.
 */
async function _Gaxios_applyResponseInterceptors(response) {
    let promiseChain = Promise.resolve(response);
    for (const interceptor of this.interceptors.response.values()) {
        if (interceptor) {
            promiseChain = promiseChain.then(interceptor.resolved, interceptor.rejected);
        }
    }
    return promiseChain;
}, _Gaxios_prepareRequest =
/**
 * Validates the options, merges them with defaults, and prepare request.
 *
 * @param options The original options passed from the client.
 * @returns Prepared options, ready to make a request
 */
async function _Gaxios_prepareRequest(options) {
    var _b, _c, _d, _e;
    const opts = (0, extend_1.default)(true, {}, this.defaults, options);
    if (!opts.url) {
        throw new Error('URL is required.');
    }
    // baseUrl has been deprecated, remove in 2.0
    const baseUrl = opts.baseUrl || opts.baseURL;
    if (baseUrl) {
        opts.url = baseUrl.toString() + opts.url;
    }
    opts.paramsSerializer = opts.paramsSerializer || this.paramsSerializer;
    if (opts.params && Object.keys(opts.params).length > 0) {
        let additionalQueryParams = opts.paramsSerializer(opts.params);
        if (additionalQueryParams.startsWith('?')) {
            additionalQueryParams = additionalQueryParams.slice(1);
        }
        const raw = opts.url.toString();
        const hash = raw.indexOf('#');
        const base = hash < 0 ? raw : raw.slice(0, hash);
        const fragment = hash < 0 ? '' : raw.slice(hash);
        const prefix = base.includes('?') ? '&' : '?';
        opts.url = base + prefix + additionalQueryParams + fragment;
    }
    if (opts.maxContentLength !== undefined) {
        opts.size = opts.maxContentLength;
    }
    if (opts.maxRedirects !== undefined) {
        opts.follow = opts.maxRedirects;
    }
    for (const key of ['size', 'follow']) if (opts[key] !== undefined && (!Number.isSafeInteger(opts[key]) || opts[key] < 0)) throw new RangeError(key + ' must be a nonnegative safe integer');
    if (opts.timeout !== undefined && (!Number.isInteger(opts.timeout) || opts.timeout < 0 || opts.timeout > 2147483647)) throw new RangeError('Invalid timeout');
    if (opts.retry || opts.retryConfig) {
        opts.retryConfig = opts.retryConfig || {};
        (0, retry_1.validateRetryConfig)(opts.retryConfig);
        opts.retryConfig.timeOfFirstRequest ??= Date.now();
    }
    opts.headers = opts.headers || {};
    if (opts.multipart === undefined && opts.data !== undefined) {
        const isFormData = typeof FormData === 'undefined'
            ? false
            : (opts === null || opts === void 0 ? void 0 : opts.data) instanceof FormData;
        if (is_stream_1.default.readable(opts.data)) {
            opts.body = opts.data;
        }
        else if (opts.data instanceof url_1.URLSearchParams || opts.data && typeof opts.data.arrayBuffer === 'function' && typeof opts.data.stream === 'function') {
            opts.body = opts.data;
        }
        else if (hasBuffer() && (ArrayBuffer.isView(opts.data) || opts.data instanceof ArrayBuffer)) {
            // Do not attempt to JSON.stringify() a Buffer:
            opts.body = opts.data instanceof ArrayBuffer ? Buffer.from(opts.data) : Buffer.from(opts.data.buffer, opts.data.byteOffset, opts.data.byteLength);
            if (!hasHeader(opts, 'Content-Type')) {
                opts.headers['Content-Type'] = 'application/json';
            }
        }
        else if (typeof opts.data === 'object') {
            // If www-form-urlencoded content type has been set, but data is
            // provided as an object, serialize the content using querystring:
            if (isFormData) {
                if (opts.fetchImplementation) opts.body = opts.data;
                else {
                    const encoded = new globalThis.Request('http://vpm.invalid/', {method: 'POST', body: opts.data});
                    opts.body = stream_1.Readable.fromWeb(encoded.body);
                    if (!hasHeader(opts, 'Content-Type')) opts.headers['Content-Type'] = encoded.headers.get('content-type');
                }
            } else {
                if (getHeader(opts, 'content-type') ===
                    'application/x-www-form-urlencoded') {
                    opts.body = opts.paramsSerializer(opts.data);
                }
                else {
                    // } else if (!(opts.data instanceof FormData)) {
                    if (!hasHeader(opts, 'Content-Type')) {
                        opts.headers['Content-Type'] = 'application/json';
                    }
                    opts.body = JSON.stringify(opts.data);
                }
            }
        }
        else {
            opts.body = opts.data;
        }
    }
    else if (opts.multipart && opts.multipart.length > 0) {
        const boundary = randomUUID();
        for (const part of opts.multipart) {
            const contentType = Object.keys(part.headers || {}).find(key => key.toLowerCase() === 'content-type');
            const value = contentType ? part.headers[contentType] : 'application/octet-stream';
            validateHeaderValue('Content-Type', value);
        }
        opts.headers['Content-Type'] = `multipart/related; boundary=${boundary}`;
        opts.body = stream_1.Readable.from(this.getMultipartRequest(opts.multipart, boundary));
    }
    opts.validateStatus = opts.validateStatus || this.validateStatus;
    opts.responseType = opts.responseType || 'unknown';
    if (!hasHeader(opts, 'Accept') && opts.responseType === 'json') {
        opts.headers['Accept'] = 'application/json';
    }
    opts.method = opts.method || 'GET';
    const proxy = opts.proxy ||
        ((_b = process === null || process === void 0 ? void 0 : process.env) === null || _b === void 0 ? void 0 : _b.HTTPS_PROXY) ||
        ((_c = process === null || process === void 0 ? void 0 : process.env) === null || _c === void 0 ? void 0 : _c.https_proxy) ||
        ((_d = process === null || process === void 0 ? void 0 : process.env) === null || _d === void 0 ? void 0 : _d.HTTP_PROXY) ||
        ((_e = process === null || process === void 0 ? void 0 : process.env) === null || _e === void 0 ? void 0 : _e.http_proxy);
    const urlMayUseProxy = __classPrivateFieldGet(this, _Gaxios_instances, "m", _Gaxios_urlMayUseProxy).call(this, opts.url, opts.noProxy);
    if (opts.agent) {
        // don't do any of the following options - use the user-provided agent.
    }
    else if (proxy && urlMayUseProxy) {
        const HttpsProxyAgent = await __classPrivateFieldGet(_a, _a, "m", _Gaxios_getProxyAgent).call(_a);
        const cacheKey = JSON.stringify(['proxy', proxy.toString(), opts.cert || null, opts.key || null]);
        if (this.agentCache.has(cacheKey)) opts.agent = this.agentCache.get(cacheKey);
        else {
            // The caller's client certificate belongs to the destination, not
            // to the proxy's TLS handshake. Keep those identities separate.
            const destinationTLS = opts.cert && opts.key ? {cert: opts.cert, key: opts.key} : {};
            class DestinationProxyAgent extends HttpsProxyAgent {
                connect(request, options) { return super.connect(request, {...options, ...destinationTLS}); }
            }
            opts.agent = new DestinationProxyAgent(proxy);
            this.agentCache.set(cacheKey, opts.agent);
        }
    }
    else if (opts.cert && opts.key) {
        const cacheKey = JSON.stringify(['tls', opts.cert, opts.key]);
        if (!this.agentCache.has(cacheKey)) this.agentCache.set(cacheKey, new https_1.Agent({cert: opts.cert, key: opts.key}));
        opts.agent = this.agentCache.get(cacheKey);
    }
    if (typeof opts.errorRedactor !== 'function' &&
        opts.errorRedactor !== false) {
        opts.errorRedactor = common_1.defaultErrorRedactor;
    }
    return opts;
}, _Gaxios_getProxyAgent = async function _Gaxios_getProxyAgent() {
    __classPrivateFieldSet(this, _a, __classPrivateFieldGet(this, _a, "f", _Gaxios_proxyAgent) || (await Promise.resolve().then(() => __importStar(require('vhttps-proxy-agent')))).HttpsProxyAgent, "f", _Gaxios_proxyAgent);
    return __classPrivateFieldGet(this, _a, "f", _Gaxios_proxyAgent);
};
/**
 * A cache for the lazily-loaded proxy agent.
 *
 * Should use {@link Gaxios[#getProxyAgent]} to retrieve.
 */
// using `import` to dynamically import the types here
_Gaxios_proxyAgent = { value: void 0 };
