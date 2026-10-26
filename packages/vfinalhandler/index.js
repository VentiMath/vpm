'use strict';

// Derived from finalhandler 2.1.1, Copyright (c) 2014-2022
// Douglas Christopher Wilson. Copyright (c) 2026 VentiMath.
// MIT licensed; see LICENSE.

const debug = require('vdebug')('finalhandler');
const encodeUrl = require('vencodeurl');
const escapeHtml = require('vescape-html');
const onFinished = require('von-finished');
const parseUrl = require('vparseurl');
const statuses = require('vstatuses');
const replacedHeaders = new Set([
  'content-encoding', 'content-language', 'content-range', 'transfer-encoding', 'trailer',
  'content-security-policy', 'x-content-type-options', 'content-type', 'content-length',
]);

module.exports = finalhandler;

function finalhandler(req, res, options) {
  const opts = options || {};
  const env = opts.env || process.env.NODE_ENV || 'development';
  const onerror = opts.onerror;
  if (onerror != null && typeof onerror !== 'function') {
    throw new TypeError('onerror must be a function');
  }
  let handled = false;

  return function done(error) {
    if (handled) {
      // The first accepted call owns the response, but Express and connect can
      // only report later errors through this callback, so keep reporting them.
      if (error && onerror) setImmediate(onerror, error, req, res);
      return;
    }
    // An ignored 404 must not prevent a later error from closing a partial response.
    if (!error && res.headersSent) {
      debug('cannot 404 after headers sent');
      return;
    }
    handled = true;

    let status = 404;
    let message;
    let headers;
    if (error) {
      const primary = error.status;
      const candidate = errorStatus(primary) ? primary : error.statusCode;
      const explicitStatus = errorStatus(candidate) ? candidate : undefined;
      status = explicitStatus ?? (errorStatus(res.statusCode) ? res.statusCode : 500);
      if (explicitStatus !== undefined && error.headers && typeof error.headers === 'object') {
        // Include array values in the snapshot while the request body drains.
        headers = Object.entries(error.headers).map(([name, value]) =>
          [name, Array.isArray(value) ? value.slice() : value]);
      }
      if (env !== 'production') {
        message = error.stack;
        if (!message && typeof error.toString === 'function') message = error.toString();
      }
      message ||= statusMessage(status);
    } else {
      let resource;
      try { resource = parseUrl.original(req)?.pathname; } catch {}
      message = 'Cannot ' + req.method + ' ' + encodeUrl(resource || 'resource');
    }

    debug('default %s', status);
    if (error && onerror) setImmediate(onerror, error, req, res);

    function canWrite() {
      if (res.writableEnded || res.destroyed || req.aborted || req.socket?.destroyed) return false;
      if (!res.headersSent) return true;
      debug('cannot %d after headers sent', status);
      if (error) req.socket?.destroy();
      return false;
    }

    function write(drainError) {
      // Another middleware or the peer can finish the response during draining.
      if (drainError || !canWrite()) return;
      const body = createHtmlDocument(message);
      res.statusCode = status;
      if (req.httpVersionMajor < 2) res.statusMessage = statusMessage(status);

      if (headers) {
        for (const [name, value] of headers) {
          if (!replacedHeaders.has(name.toLowerCase())) res.setHeader(name, value);
        }
      }
      // The new HTML body replaces both existing and error-supplied framing.
      res.removeHeader('Content-Encoding');
      res.removeHeader('Content-Language');
      res.removeHeader('Content-Range');
      res.removeHeader('Transfer-Encoding');
      res.removeHeader('Trailer');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));
      if (req.method === 'HEAD') res.end();
      else res.end(body, 'utf8');
    }

    if (!canWrite()) return;
    if (onFinished.isFinished(req)) write();
    else {
      req.unpipe();
      onFinished(req, write);
      req.resume();
    }
  };
}

function errorStatus(status) {
  return Number.isInteger(status) && status >= 400 && status <= 599;
}

function statusMessage(status) {
  return statuses.message[status] || 'Unknown Error';
}

function createHtmlDocument(message) {
  const body = escapeHtml(message).replaceAll('\n', '<br>').replaceAll('  ', ' &nbsp;');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<title>Error</title>\n</head>\n<body>\n<pre>' + body + '</pre>\n</body>\n</html>\n';
}
