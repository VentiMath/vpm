'use strict';
// Independent, source-informed Storage 8.4.0 URL signing implementation.
// Google LLC's Apache-2.0 attribution for the API contract is retained.
const {createHash} = require('node:crypto');
const {stringify} = require('node:querystring');
const PATH_STYLED_HOST = 'https://storage.googleapis.com';
const SignerExceptionMessages = {
    ACCESSIBLE_DATE_INVALID: 'The accessible at date provided was invalid.',
    EXPIRATION_BEFORE_ACCESSIBLE_DATE: 'An expiration date cannot be before accessible date.',
    X_GOOG_CONTENT_SHA256: 'The header X-Goog-Content-SHA256 must be a hexadecimal string.',
};
const reservedQuery = /^(?:googleaccessid|expires|signature|x-goog-(?:algorithm|credential|date|expires|signedheaders|signature))$/i;
const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, character => '%' + character.charCodeAt(0).toString(16).toUpperCase());
const timestamp = date => {
    const pad = (value, length = 2) => String(value).padStart(length, '0');
    const day = pad(date.getUTCFullYear(), 4) + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate());
    return {day, time: day + 'T' + pad(date.getUTCHours()) + pad(date.getUTCMinutes()) + pad(date.getUTCSeconds()) + 'Z'};
};

class SigningError extends Error {
    constructor(...args) { super(...args); this.name = 'SigningError'; }
}
function signingError(error) {
    const result = new SigningError(error.message);
    result.stack = error.stack;
    return result;
}
function copyQuery(source) {
    const result = {...source};
    for (const key of Object.keys(result)) {
        if (reservedQuery.test(key)) throw new TypeError('queryParams cannot override signing parameter: ' + key);
        if (Array.isArray(result[key])) result[key] = result[key].slice();
    }
    return result;
}
function normalizeHeaders(headers) {
    const result = Object.create(null);
    for (const name of Object.keys(headers)) {
        const raw = headers[name];
        if (raw === undefined) continue;
        if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) throw new TypeError('Invalid signing header name');
        const parts = Array.isArray(raw) ? raw : [raw], values = [];
        for (const part of parts) {
            if (typeof part !== 'string' && typeof part !== 'number') throw new TypeError('Invalid signing header value');
            const text = String(part);
            if (/[\r\n\0]/.test(text)) throw new TypeError('Invalid signing header value');
            values.push(text.trim().replace(/[ \t]+/g, ' '));
        }
        const key = name.toLowerCase(), value = values.join(',');
        result[key] = Object.hasOwn(result, key) ? result[key] + ',' + value : value;
    }
    return result;
}

class URLSigner {
    constructor(auth, bucket, file, storage) {
        this.auth = auth;
        this.bucket = bucket;
        this.file = file;
        this.storage = storage === undefined ? new (require('./storage.js').Storage)() : storage;
    }
    getSignedUrl(input) {
        const cfg = {...input};
        const queryParams = copyQuery(cfg.queryParams);
        const expiration = this.parseExpires(cfg.expires), accessible = this.parseAccessibleAt(cfg.accessibleAt);
        if (expiration < accessible) throw new Error(SignerExceptionMessages.EXPIRATION_BEFORE_ACCESSIBLE_DATE);
        const bucket = this.bucket.name, file = this.file ? encode(this.file.name).replace(/%2F/g, '/') : undefined;
        const cname = cfg.cname || (cfg.virtualHostedStyle ? `https://${bucket}.storage.${this.storage.universeDomain}` : undefined);
        const config = {...cfg, queryParams, extensionHeaders: normalizeHeaders(cfg.extensionHeaders || {}), expiration,
            accessibleAt: new Date(accessible * 1000), bucket, file};
        if (cname) config.cname = String(cname);
        if (cfg.host != null) config.host = cfg.host.toString();
        if (cfg.signingEndpoint != null) config.signingEndpoint = cfg.signingEndpoint.toString();
        const version = cfg.version || 'v2';
        if (version !== 'v2' && version !== 'v4') throw new Error(`Invalid signed URL version: ${version}. Supported versions are 'v2' and 'v4'.`);
        // URL, bucket and file identities belong to this operation, not to mutable
        // caller objects that may change while credentials are being obtained.
        const destination = new URL(config.host || config.cname || this.storage.apiEndpoint);
        destination.pathname = this.getResourcePath(!!config.cname, bucket, file);
        const signed = version === 'v2' ? this.getSignedUrlV2(config) : this.getSignedUrlV4(config);
        return signed.then(query => {
            destination.search = stringify({...query, ...queryParams}, '&', '=', {encodeURIComponent: encode});
            return destination.href;
        });
    }
    getSignedUrlV2(config) {
        const expiration = config.expiration, endpoint = config.signingEndpoint?.toString(), auth = this.auth;
        const text = [config.method, config.contentMd5 || '', config.contentType || '', expiration,
            this.getCanonicalHeaders(config.extensionHeaders || {}) + this.getResourcePath(false, config.bucket, config.file)].join('\n');
        return (async () => {
            try {
                const signature = await auth.sign(text, endpoint), credentials = await auth.getCredentials();
                return {GoogleAccessId: credentials.client_email, Expires: expiration, Signature: signature};
            } catch (error) { throw signingError(error); }
        })();
    }
    getSignedUrlV4(config) {
        const date = new Date(config.accessibleAt || Date.now()), duration = config.expiration - date.valueOf() / 1000;
        if (duration > 604800) throw new Error('Max allowed expiration is seven days (604800 seconds).');
        const headers = normalizeHeaders(config.extensionHeaders || {});
        headers.host = new URL(config.host?.toString() || config.cname || this.storage.apiEndpoint).host;
        if (config.contentMd5) headers['content-md5'] = config.contentMd5;
        if (config.contentType) headers['content-type'] = config.contentType;
        const payload = headers['x-goog-content-sha256'];
        if (payload !== undefined && (typeof payload !== 'string' || !/^[a-fA-F0-9]{64}$/.test(payload))) throw new Error(SignerExceptionMessages.X_GOOG_CONTENT_SHA256);
        const signedHeaders = Object.keys(headers).sort().join(';'), canonicalHeaders = this.getCanonicalHeaders(headers);
        const {day, time} = timestamp(date), scope = day + '/auto/storage/goog4_request';
        const resource = this.getResourcePath(!!config.cname, config.bucket, config.file), method = config.method;
        const customQuery = copyQuery(config.queryParams), endpoint = config.signingEndpoint?.toString(), auth = this.auth;
        return (async () => {
            const credentials = await auth.getCredentials();
            const query = {'X-Goog-Algorithm': 'GOOG4-RSA-SHA256', 'X-Goog-Credential': credentials.client_email + '/' + scope,
                'X-Goog-Date': time, 'X-Goog-Expires': String(duration), 'X-Goog-SignedHeaders': signedHeaders, ...customQuery};
            const canonical = this.getCanonicalRequest(method, resource, this.getCanonicalQueryParams(query), canonicalHeaders, signedHeaders, payload);
            const text = ['GOOG4-RSA-SHA256', time, scope, createHash('sha256').update(canonical).digest('hex')].join('\n');
            try {
                const signature = await auth.sign(text, endpoint);
                return {...query, 'X-Goog-Signature': Buffer.from(signature, 'base64').toString('hex')};
            } catch (error) { throw signingError(error); }
        })();
    }
    getCanonicalHeaders(headers) {
        const values = normalizeHeaders(headers), lines = [];
        for (const name of Object.keys(values).sort()) lines.push(name + ':' + values[name] + '\n');
        return lines.join('');
    }
    getCanonicalQueryParams(query) {
        const entries = Object.keys(query).map(key => {
            const value = query[key];
            if (typeof value !== 'string') throw new TypeError('Signing query values must be strings');
            return [encode(key), encode(value)];
        });
        entries.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
        return entries.map(([key, value]) => key + '=' + value).join('&');
    }
    getCanonicalRequest(method, path, query, headers, signedHeaders, contentSha256) {
        return [method, path, query, headers, signedHeaders, contentSha256 || 'UNSIGNED-PAYLOAD'].join('\n');
    }
    getResourcePath(cname, bucket, file) {
        return cname ? '/' + (file || '') : '/' + bucket + (file ? '/' + file : '');
    }
    parseExpires(expires, current = new Date()) {
        const time = new Date(expires).valueOf();
        if (Number.isNaN(time)) throw new Error('The expiration date provided was invalid.');
        if (time < current.valueOf()) throw new Error('An expiration date cannot be in the past.');
        return Math.floor(time / 1000);
    }
    parseAccessibleAt(accessibleAt) {
        const time = new Date(accessibleAt ?? Date.now()).valueOf();
        if (Number.isNaN(time)) throw new Error(SignerExceptionMessages.ACCESSIBLE_DATE_INVALID);
        return Math.floor(time / 1000);
    }
}
module.exports = {URLSigner, SigningError, PATH_STYLED_HOST, SignerExceptionMessages, normalizeHeaders};
