'use strict';
const http = require('node:http');
const { PassThrough } = require('node:stream');
const { EventEmitter } = require('node:events');
const assert = require('node:assert/strict');

function responseBody(req, error) {
  if (error) {
    const result = {};
    for (const key of ['status', 'type', 'charset', 'encoding', 'limit', 'received', 'expected']) {
      if (error[key] !== undefined) result[key] = error[key];
    }
    return { error: result };
  }
  return { body: req.body === undefined ? null : Buffer.isBuffer(req.body) ? req.body.toString('hex') : req.body, buffer: Buffer.isBuffer(req.body) };
}
async function listen(middleware) {
  const server = http.createServer((req, res) => middleware(req, res, error => {
    res.statusCode = error?.status || 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(responseBody(req, error)));
  }));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return server;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
function request(server, body = '', headers = {}, agent = false) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: '/', method: 'POST', agent,
      headers: { 'content-length': Buffer.byteLength(body), ...headers } }, res => {
      let output = '';
      res.setEncoding('utf8'); res.on('data', chunk => { output += chunk; });
      res.on('error', reject); res.on('end', () => resolve({ status: res.statusCode, result: JSON.parse(output) }));
    });
    req.setTimeout(3000, () => req.destroy(new Error('HTTP test timed out')));
    req.on('error', reject); req.end(body);
  });
}
async function exchange(middleware, body, headers) {
  const server = await listen(middleware);
  try { return await request(server, body, headers); } finally { await close(server); }
}
function incoming(headers) {
  const req = new PassThrough();
  req.headers = headers;
  req.complete = false;
  req.socket = Object.assign(new EventEmitter(), { readable: true, writable: true });
  req.once('end', () => { req.complete = true; });
  return req;
}
async function invoke(middleware, req, feed) {
  let calls = 0;
  let timer;
  try {
    const result = await Promise.race([
      new Promise((resolve, reject) => {
        middleware(req, {}, error => { calls++; if (calls > 1) reject(new Error('next called twice')); else resolve(error); });
        if (feed) feed(req);
      }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('middleware did not settle')), 1000); }),
    ]);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 1);
    return result;
  } finally { clearTimeout(timer); req.destroy(); }
}
module.exports = { listen, close, request, exchange, incoming, invoke };
