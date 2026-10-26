'use strict';

// Derived from serve-static 2.2.1. Copyright (c) 2010 Sencha Inc.,
// 2011 LearnBoost and TJ Holowaychuk, 2014-2016 Douglas Christopher Wilson.
// Copyright (c) 2026 VentiMath. MIT licensed; see LICENSE.
const encodeUrl = require('vencodeurl');
const escapeHtml = require('vescape-html');
const parseUrl = require('vparseurl');
const send = require('vsend');
const { resolve } = require('node:path');
const { format } = require('node:url');

module.exports = function serveStatic(root, options) {
  if (typeof root !== 'string' || !root || root.includes('\0')) throw new TypeError('root must be a nonempty path string without NUL');
  if (options != null && (typeof options !== 'object' || Array.isArray(options))) throw new TypeError('options must be an object');
  const fallthroughValue = options?.fallthrough;
  const redirectValue = options?.redirect;
  const fallthrough = fallthroughValue !== false;
  const redirect = redirectValue !== false;
  const setHeaders = options?.setHeaders;
  for (const [name, value] of [['fallthrough', fallthroughValue], ['redirect', redirectValue]]) {
    if (value != null && typeof value !== 'boolean') throw new TypeError(name + ' must be a boolean');
  }
  if (setHeaders != null && typeof setHeaders !== 'function') throw new TypeError('setHeaders must be a function');
  // Let the sender validate and snapshot its supported options, including
  // inherited values. This constructor does no I/O and is not retained.
  const supplied = Object.create(options || null);
  Object.defineProperty(supplied, 'root', { value: resolve(root), enumerable: true });
  const sendOptions = send({ headers: {} }, '/', supplied).options;

  return function serveStatic(req, res, next) {
    if (res.writableEnded || res.destroyed || req.aborted || req.socket?.destroyed) return;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (fallthrough) return next();
      if (res.headersSent) return next(httpError(500, "Can't set headers after they are sent."));
      clearRepresentation(res);
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.setHeader('Content-Length', '0');
      res.end();
      return;
    }

    let forwardError = !fallthrough;
    function fail(error) { next(forwardError || !(error.statusCode < 500) ? error : undefined); }
    let original; let pathname;
    try {
      original = parseUrl.original(req);
      pathname = parseUrl(req)?.pathname;
    } catch { fail(httpError(400, 'Invalid request URL')); return; }
    if (typeof pathname !== 'string' || typeof original?.pathname !== 'string') {
      fail(httpError(400, 'Invalid request URL')); return;
    }
    // Express removes the mount prefix; redirect /assets to /assets/ before
    // looking for the mounted root's index.
    if (pathname === '/' && !original.pathname.endsWith('/')) pathname = '';
    const stream = send(req, pathname, sendOptions);
    stream.on('directory', function directory(response) {
      if (!redirect || this.hasTrailingSlash()) { this.error(404); return; }
      // vparseurl results are shared with other middleware. Format a copy.
      const location = encodeUrl(format({ ...original, path: null,
        pathname: (original.pathname + '/').replace(/^\/+/, '/') }));
      const document = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
        '<title>Redirecting</title>\n</head>\n<body>\n<pre>Redirecting to ' + escapeHtml(location) +
        '</pre>\n</body>\n</html>\n';
      clearRepresentation(response);
      response.statusCode = 301;
      response.setHeader('Content-Type', 'text/html; charset=UTF-8');
      response.setHeader('Content-Length', Buffer.byteLength(document));
      response.setHeader('Content-Security-Policy', "default-src 'none'");
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Location', location);
      response.end(req.method === 'HEAD' ? undefined : document);
    });
    if (setHeaders) stream.on('headers', setHeaders);
    if (fallthrough) stream.on('file', () => { forwardError = true; });
    stream.on('error', fail);
    stream.pipe(res);
  };
};

function clearRepresentation(res) {
  for (const name of ['Content-Type', 'Content-Encoding', 'Content-Language', 'Content-Range', 'Transfer-Encoding', 'Trailer']) res.removeHeader(name);
}
function httpError(status, message) {
  return Object.assign(new Error(message), { status, statusCode: status, expose: status < 500 });
}
