'use strict';
const http = require('node:http');
const https = require('node:https');
const { TextDecoder } = require('node:util');
const { ArgumentError, JwksError } = require('./errors');
const decoder = new TextDecoder('utf-8', { fatal: true });
function timeoutError() { const error = new JwksError('JWKS request timed out'); error.code = 'ETIMEDOUT'; return error; }
function deadline(operation, timeout) {
  if (!timeout) return Promise.resolve().then(operation);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(timeoutError()), timeout);
    Promise.resolve().then(operation).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
function request({ uri, headers, agent, timeout = 30000, maxResponseBytes = 1048576, fetcher }) {
  if (fetcher) return deadline(() => fetcher(uri), timeout);
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(uri); } catch { reject(new ArgumentError('Invalid JWKS URI: The provided URI is not a valid URL.')); return; }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) { reject(new ArgumentError('JWKS URI must use HTTP(S) without credentials or a fragment')); return; }
    let settled = false, timer, req, response;
    const chunks = []; let length = 0;
    function finish(error, value) {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) { response?.destroy(); req?.destroy(); chunks.length = 0; reject(error); }
      else resolve(value);
    }
    try {
      req = (url.protocol === 'https:' ? https : http).request(url, { method:'GET', headers, agent, timeout }, res => {
        response = res;
        if (settled) { res.destroy(); return; }
        res.on('error', error => finish(error));
        res.on('aborted', () => finish(new JwksError('JWKS response aborted')));
        res.on('close', () => { if (!res.complete) finish(new JwksError('JWKS response closed before completion')); });
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new JwksError(res.statusMessage || 'Http Error ' + res.statusCode);
          error.statusCode = res.statusCode; error.errorMsg = error.message; finish(error); return;
        }
        const declared = res.headers['content-length'];
        if (declared !== undefined && Number(declared) > maxResponseBytes) { finish(new JwksError('JWKS response exceeded maxResponseBytes')); return; }
        res.on('data', chunk => {
          if (settled) return;
          length += chunk.length;
          if (length > maxResponseBytes) { finish(new JwksError('JWKS response exceeded maxResponseBytes')); return; }
          chunks.push(chunk);
        });
        res.on('end', () => {
          if (settled) return;
          try {
            const value = JSON.parse(decoder.decode(chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, length)));
            chunks.length = 0; finish(null, value);
          } catch { finish(new JwksError('JWKS response must be valid UTF-8 JSON')); }
        });
      });
      req.on('error', error => finish(error));
      req.on('timeout', () => finish(timeoutError()));
      if (timeout) timer = setTimeout(() => finish(timeoutError()), timeout);
      req.end();
    } catch (error) { finish(error); }
  });
}
module.exports = { request, deadline };
