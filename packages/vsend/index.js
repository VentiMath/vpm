'use strict';

// Derived from send 1.2.1, Copyright (c) 2012 TJ Holowaychuk and
// Copyright (c) 2014-2022 Douglas Christopher Wilson.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.
const createError = require('vhttp-errors');
const debug = require('vdebug')('send');
const encodeUrl = require('vencodeurl');
const escapeHtml = require('vescape-html');
const etag = require('vetag');
const fresh = require('vfresh');
const fs = require('node:fs');
const mime = require('vmime-types');
const ms = require('vms');
const onFinished = require('von-finished');
const parseRange = require('vrange-parser');
const path = require('node:path');
const statuses = require('vstatuses');
const { Stream } = require('node:stream');
const upPath = /(?:^|[\\/])\.\.(?:[\\/]|$)/;
const strongTag = /^"[\x21\x23-\x7e\x80-\xff]*"$/;
const maximumAge = 365 * 24 * 60 * 60 * 1000;

module.exports = function send(req, pathname, options) {
  return new SendStream(req, pathname, options);
};

class SendStream extends Stream {
  constructor(req, pathname, options) {
    super();
    if (!req || typeof req !== 'object' || !req.headers) throw new TypeError('req must be an HTTP request');
    if (typeof pathname !== 'string') throw new TypeError('path must be a string');
    if (options != null && (typeof options !== 'object' || Array.isArray(options))) throw new TypeError('options must be an object');
    // Express download() and serve-static inherit options with Object.create().
    // Snapshot supported fields by lookup, without forwarding arbitrary fs options.
    const opts = {};
    for (const name of ['acceptRanges', 'cacheControl', 'etag', 'lastModified', 'immutable', 'dotfiles',
      'extensions', 'index', 'start', 'end', 'highWaterMark', 'maxAge', 'maxage', 'root']) {
      const value = options?.[name];
      if (value !== undefined) opts[name] = Array.isArray(value) ? Object.freeze([...value]) : value;
    }
    this.options = Object.freeze(opts);
    this.req = req;
    this.path = pathname;
    this._acceptRanges = opts.acceptRanges === undefined || Boolean(opts.acceptRanges);
    this._cacheControl = opts.cacheControl === undefined || Boolean(opts.cacheControl);
    this._etag = opts.etag === undefined || Boolean(opts.etag);
    this._lastModified = opts.lastModified === undefined || Boolean(opts.lastModified);
    this._immutable = Boolean(opts.immutable);
    this._dotfiles = opts.dotfiles ?? 'ignore';
    if (!['allow', 'deny', 'ignore'].includes(this._dotfiles)) throw new TypeError('dotfiles must be allow, deny, or ignore');
    this._extensions = normalizeList(opts.extensions, 'extensions');
    this._index = opts.index === undefined ? ['index.html'] : normalizeList(opts.index, 'index');
    for (const name of ['start', 'end', 'highWaterMark']) {
      if (opts[name] !== undefined && (!Number.isSafeInteger(opts[name]) || opts[name] < (name === 'highWaterMark' ? 1 : 0))) {
        throw new TypeError(name + ' must be a ' + (name === 'highWaterMark' ? 'positive' : 'non-negative') + ' safe integer');
      }
    }
    if (opts.end !== undefined && opts.end < (opts.start ?? 0)) throw new RangeError('end must be at least start');
    const age = opts.maxAge ?? opts.maxage;
    const number = typeof age === 'string' ? (age ? ms(age) : 0) : typeof age === 'number' ? age : 0;
    this._maxage = Number.isNaN(number) || number === undefined ? 0 : Math.min(Math.max(0, number), maximumAge);
    if (opts.root !== undefined && typeof opts.root !== 'string') throw new TypeError('root must be a string');
    this._root = opts.root ? path.resolve(opts.root) : null;
    this._failed = false;
    this._finished = false;
    this._stream = null;
  }

  _stopped() {
    return this._failed || this._finished || this.res?.writableEnded || this.res?.destroyed ||
      this.req.aborted || this.req.socket?.destroyed;
  }

  pipe(res) {
    if (this.res) throw new Error('a send stream can only be piped once');
    this.res = res;
    if (this._stopped()) return res;
    // Watch before stat or any user hook; a disconnect can happen before opening.
    const finished = () => {
      this._finished = true; this._stream?.destroy();
      res.removeListener('finish', finished); res.removeListener('close', finished); res.removeListener('error', finished);
    };
    // HTTP/2's compatibility socket can be non-writable on HEAD before the
    // response starts. Its response events are the completion authority.
    if (this.req.httpVersionMajor >= 2) {
      res.once('finish', finished); res.once('close', finished); res.once('error', finished);
    } else onFinished(res, finished);
    if (res.headersSent) { this.headersAlreadySent(); return res; }
    let filename;
    try { filename = decodeURIComponent(this.path); } catch { this.error(400); return res; }
    if (filename.includes('\0')) { this.error(400); return res; }
    if (this._root !== null && filename) filename = path.normalize('.' + path.sep + filename);
    if (upPath.test(filename)) { this.error(403); return res; }
    filename = this._root === null ? path.resolve(filename) : path.join(this._root, filename);
    if (!this._allowed(filename)) return res;
    if (this._index.length && this.hasTrailingSlash()) this.sendIndex(filename);
    else this.sendFile(filename);
    return res;
  }

  _allowed(filename) {
    const relative = this._root === null ? filename : path.relative(this._root, filename);
    if (this._root !== null && (path.isAbsolute(relative) || upPath.test(relative))) {
      this.error(403); return false;
    }
    if (this._dotfiles !== 'allow' && relative.split(path.sep).some(part => part.length > 1 && part[0] === '.')) {
      this.error(this._dotfiles === 'deny' ? 403 : 404); return false;
    }
    return true;
  }

  sendFile(filename) {
    if (this._stopped() || !this._allowed(filename)) return;
    fs.stat(filename, (error, stat) => {
      if (this._stopped()) return;
      if (error?.code === 'ENOENT' && !path.extname(filename) && !filename.endsWith(path.sep)) {
        this._tryFiles(this._extensions.map(extension => filename + '.' + extension), error); return;
      }
      if (error) { this.onStatError(error); return; }
      if (stat.isDirectory()) { this.redirect(filename); return; }
      if (filename.endsWith(path.sep) || !stat.isFile()) { this.error(404); return; }
      this.emit('file', filename, stat);
      this.send(filename, stat);
    });
  }

  sendIndex(directory) {
    this._tryFiles(this._index.map(index => path.join(directory, index)));
  }

  _tryFiles(candidates, lastError) {
    let index = 0;
    const next = error => {
      if (this._stopped()) return;
      if (index === candidates.length) {
        if (error) this.onStatError(error); else this.error(404);
        return;
      }
      const filename = candidates[index++];
      if (!this._allowed(filename)) return;
      fs.stat(filename, (error, stat) => {
        if (this._stopped()) return;
        if (error) { next(error); return; }
        if (!stat.isFile()) { next(); return; }
        this.emit('file', filename, stat);
        this.send(filename, stat);
      });
    };
    next(lastError);
  }

  send(filename, stat) {
    if (this._stopped()) return;
    const res = this.res;
    if (res.headersSent) { this.headersAlreadySent(); return; }
    if (!Number.isSafeInteger(stat.size) || stat.size < 0) { this.error(500); return; }
    debug('pipe "%s"', filename);
    this.setHeader(filename, stat);
    if (this._stopped()) return;
    if (res.headersSent) { this.headersAlreadySent(); return; }
    this.type(filename);
    if (this.isCachable() && !['CONNECT', 'OPTIONS', 'TRACE'].includes(this.req.method) && this.isConditionalGET()) {
      if (this.isPreconditionFailure()) { this.error(412); return; }
      if (this.req.method === 'GET' || this.req.method === 'HEAD') {
        if (this.isFresh()) { this.notModified(); return; }
      } else if (fresh({ 'if-none-match': this.req.headers['if-none-match'] }, this._validators())) {
        this.error(412); return;
      }
    }
    let offset = this.options.start ?? 0;
    let length = Math.max(0, stat.size - offset);
    if (this.options.end !== undefined) length = Math.min(length, this.options.end - offset + 1);
    const range = this.req.headers.range;
    res.removeHeader('Content-Range');
    // Range modifies GET only, and only an otherwise 200 response.
    if (this._acceptRanges && this.req.method === 'GET' && res.statusCode === 200 &&
        typeof range === 'string' && /^[ \t]*bytes=/i.test(range) && this.isRangeFresh()) {
      const ranges = parseRange(length, range, { combine: true });
      if (ranges === -1) { this.error(416, { headers: { 'Content-Range': 'bytes */' + length } }); return; }
      if (ranges !== -2 && ranges.length === 1) {
        const selected = ranges[0];
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${selected.start}-${selected.end}/${length}`);
        offset += selected.start;
        length = selected.end - selected.start + 1;
      }
    }
    removeFraming(res);
    res.setHeader('Content-Length', length);
    if (this.req.method === 'HEAD') { res.end(); return; }
    if (length === 0) { res.end(); this.emit('end'); return; }
    this.stream(filename, { start: offset, end: offset + length - 1, highWaterMark: this.options.highWaterMark });
  }

  stream(filename, options) {
    if (this._stopped()) return;
    const res = this.res;
    let input;
    try { input = fs.createReadStream(filename, options); } catch (error) { this.onStatError(error); return; }
    this._stream = input;
    let ended = false;
    // Install handlers before exposing the stream to application listeners.
    input.on('error', error => {
      input.unpipe(res); input.destroy();
      this.onStatError(error);
    });
    input.once('close', () => {
      if (this._stream === input) this._stream = null;
      if (!ended && !this._stopped()) this.error(500, new Error('file stream closed before ending'));
    });
    input.once('end', () => {
      ended = true;
      if (this._stopped()) return;
      if (options && input.bytesRead !== options.end - options.start + 1) {
        this.error(500, new Error('file changed length during transfer')); return;
      }
      this.emit('end');
    });
    this.emit('stream', input);
    if (this._stopped() || input.destroyed) { input.destroy(); return; }
    input.pipe(res);
  }

  error(status, error) {
    if (this._failed) return;
    this._failed = true;
    this._stream?.unpipe(this.res);
    this._stream?.destroy();
    const result = !error ? createError(status) : error instanceof Error ? createError(status, error, { expose: false }) : createError(status, error);
    if (this.listenerCount('error')) { this.emit('error', result); return; }
    const res = this.res;
    if (this._finished || res.destroyed || res.writableEnded) return;
    if (res.headersSent) { res.destroy(); return; }
    for (const name of res.getHeaderNames()) res.removeHeader(name);
    if (result.headers) for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
    res.statusCode = result.status;
    this._html('Error', escapeHtml(statuses.message[result.status] || String(result.status)));
  }

  _html(title, body) {
    const res = this.res;
    const document = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>' + title +
      '</title>\n</head>\n<body>\n<pre>' + body + '</pre>\n</body>\n</html>\n';
    removeFraming(res);
    res.removeHeader('Content-Encoding');
    res.removeHeader('Content-Language');
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Content-Length', Buffer.byteLength(document));
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(this.req.method === 'HEAD' ? undefined : document);
  }

  redirect(filename) {
    if (this._stopped()) return;
    if (this.res.headersSent) { this.headersAlreadySent(); return; }
    if (this.listenerCount('directory')) { this.emit('directory', this.res, filename); return; }
    if (this.hasTrailingSlash()) { this.error(403); return; }
    const location = encodeUrl((this.path + '/').replace(/^\/+/, '/'));
    this.res.statusCode = 301;
    this.res.removeHeader('Content-Range');
    this.res.setHeader('Location', location);
    this._html('Redirecting', 'Redirecting to ' + escapeHtml(location));
  }

  hasTrailingSlash() { return this.path.endsWith('/'); }
  headersAlreadySent() { this.error(500, new Error("Can't set headers after they are sent.")); }
  onStatError(error) { this.error(['ENOENT', 'ENOTDIR', 'ENAMETOOLONG'].includes(error.code) ? 404 : 500, error); }
  isCachable() { return this.res.statusCode >= 200 && this.res.statusCode < 300 || this.res.statusCode === 304; }
  isConditionalGET() {
    return ['if-match', 'if-unmodified-since', 'if-none-match', 'if-modified-since'].some(name => this.req.headers[name] !== undefined);
  }
  _validators() { return { etag: this.res.getHeader('ETag'), 'last-modified': this.res.getHeader('Last-Modified') }; }
  isFresh() {
    const headers = this.req.headers;
    return fresh({
      'cache-control': headers['cache-control'],
      'if-none-match': headers['if-none-match'],
      'if-modified-since': headers['if-none-match'] === undefined ? headers['if-modified-since'] : undefined,
    }, this._validators());
  }
  isPreconditionFailure() {
    const headers = this.req.headers;
    if (headers['if-match'] !== undefined) return !matchesStrong(headers['if-match'], this.res.getHeader('ETag'));
    const unmodified = httpDate(headers['if-unmodified-since']);
    const modified = httpDate(this.res.getHeader('Last-Modified'));
    return Number.isFinite(unmodified) && Number.isFinite(modified) && modified > unmodified;
  }
  isRangeFresh() {
    const value = this.req.headers['if-range'];
    if (value === undefined) return true;
    if (typeof value !== 'string') return false;
    const condition = trimOWS(value);
    const tag = this.res.getHeader('ETag');
    if (condition.includes('"')) return validStrong(condition) && validStrong(tag) && condition === tag;
    const date = httpDate(condition);
    return Number.isFinite(date) && date === httpDate(this.res.getHeader('Last-Modified'));
  }
  removeContentHeaderFields() {
    for (const name of ['Content-Encoding', 'Content-Language', 'Content-Length', 'Content-Range', 'Content-Type']) this.res.removeHeader(name);
  }
  notModified() {
    this.removeContentHeaderFields(); removeFraming(this.res);
    this.res.statusCode = 304; this.res.end();
  }
  type(filename) {
    if (!this.res.getHeader('Content-Type')) this.res.setHeader('Content-Type', mime.contentType(path.extname(filename)) || 'application/octet-stream');
  }
  setHeader(filename, stat) {
    const res = this.res;
    this.emit('headers', res, filename, stat);
    if (this._stopped() || res.headersSent) return;
    if (this._acceptRanges && !res.getHeader('Accept-Ranges')) res.setHeader('Accept-Ranges', 'bytes');
    if (this._cacheControl && !res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', 'public, max-age=' + Math.floor(this._maxage / 1000) + (this._immutable ? ', immutable' : ''));
    }
    if (this._lastModified && !res.getHeader('Last-Modified')) res.setHeader('Last-Modified', stat.mtime.toUTCString());
    if (this._etag && !res.getHeader('ETag')) res.setHeader('ETag', etag(stat));
  }
}

function normalizeList(value, name) {
  if (value == null || value === false) return [];
  const list = typeof value === 'string' ? [value] : Array.isArray(value) ? [...value] : [value];
  for (const entry of list) {
    if (typeof entry !== 'string' || !entry || entry.includes('\0') || path.isAbsolute(entry) || path.win32.isAbsolute(entry) ||
        upPath.test(entry) || (name === 'extensions' && /[\\/]/.test(entry))) throw new TypeError(name + ' must contain relative names without parent traversal');
  }
  return Object.freeze(list);
}
function removeFraming(res) { res.removeHeader('Transfer-Encoding'); res.removeHeader('Trailer'); }
function httpDate(value) { return typeof value === 'string' ? Date.parse(value) : NaN; }
function ows(code) { return code === 32 || code === 9; }
function trimOWS(value) {
  let start = 0; let end = value.length;
  while (start < end && ows(value.charCodeAt(start))) start++;
  while (end > start && ows(value.charCodeAt(end - 1))) end--;
  return value.slice(start, end);
}
function validStrong(value) { return typeof value === 'string' && value.endsWith('"') && strongTag.test(value); }
function matchesStrong(value, tag) {
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) value = value.join(',');
  if (typeof value !== 'string') return false;
  if (trimOWS(value) === '*') return true; // A file has already been found, even without an ETag.
  let index = 0; let matched = false;
  while (index < value.length) {
    while (ows(value.charCodeAt(index)) || value[index] === ',') index++;
    if (index === value.length) break;
    const weak = value.startsWith('W/', index);
    if (weak) index += 2;
    const start = index;
    if (value.charCodeAt(index++) !== 34) return false;
    while (index < value.length && value.charCodeAt(index) !== 34) {
      const code = value.charCodeAt(index++);
      if (!(code === 33 || code >= 35 && code <= 126 || code >= 128 && code <= 255)) return false;
    }
    if (index === value.length) return false;
    index++;
    if (!weak && value.slice(start, index) === tag) matched = true;
    while (ows(value.charCodeAt(index))) index++;
    if (index < value.length && value[index] !== ',') return false;
  }
  return validStrong(tag) && matched;
}
