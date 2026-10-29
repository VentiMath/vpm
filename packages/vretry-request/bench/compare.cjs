'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http');
const {PassThrough} = require('node:stream');
const upstream = require('../../../scripts/retry-request-conformance/node_modules/retry-request'), vpm = require('..');
const {teenyRequest} = require('../../../scripts/retry-request-conformance/node_modules/teeny-request');
const cases = [];
for (const statusCode of [200, 503]) cases.push({name: 'status ' + statusCode + ' policy', async: false,
  make: lib => { const response = {statusCode}; return () => lib.defaults.shouldRetryFn(response); },
  validate: value => assert.equal(!!value, statusCode === 503)});
cases.push({name: 'backoff calculation', async: false, make: lib => {
  const config = {maxRetryDelay: 64, retryDelayMultiplier: 2, retryNumber: 2, timeOfFirstRequest: Date.now(), totalTimeout: 600};
  return () => lib.getNextRetryDelay(config);
}, validate: value => assert(value >= 4000 && value < 5000)});
for (const fail of [false, true]) cases.push({name: fail ? 'terminal callback error' : 'successful callback', async: false,
  make: lib => { const response = {statusCode: 200}, error = new Error('transport'), opts = {noResponseRetries: 0, request(o, cb) { cb(fail ? error : null, response, 'ok'); }};
    return () => { let result; lib(null, opts, (err, r, body) => { result = err || body; }); return result; };
  }, validate: value => fail ? assert.equal(value.message, 'transport') : assert.equal(value, 'ok')});
cases.push({name: 'asynchronous callback', async: true, make: lib => {
  const opts = {request(o, cb) { queueMicrotask(() => cb(null, {statusCode: 200}, 'ok')); }};
  return () => new Promise(resolve => lib(null, opts, (err, r, body) => resolve(body)));
}, validate: value => assert.equal(value, 'ok')});
for (const [name, objectMode, chunks] of [['16KiB stream', false, [Buffer.alloc(16384)]], ['32 chunk stream', false, Array(32).fill(Buffer.alloc(512))], ['32 object stream', true, Array.from({length: 32}, (_, i) => ({i}))]]) {
  cases.push({name, async: true, make: lib => {
    const opts = {objectMode, request() {
      const source = new PassThrough({objectMode});
      setImmediate(() => { source.emit('response', {statusCode: 200}); for (const chunk of chunks) source.write(chunk); source.end(); });
      return source;
    }};
    return async () => { let total = 0; for await (const value of lib(null, opts)) total += objectMode ? 1 : value.length; return total; };
  }, validate: value => assert.equal(value, objectMode ? 32 : 16384)});
}
let server;
(async () => {
  server = http.createServer((req, res) => res.end('ok'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  cases.push({name: 'HTTP callback with teeny-request', async: true, make: lib => () => new Promise((resolve, reject) => lib(url, {request: teenyRequest}, (error, response, body) => error ? reject(error) : resolve(body))), validate: value => assert.equal(value, 'ok')});
  cases.push({name: 'HTTP stream with teeny-request', async: true, make: lib => async () => { let body = ''; for await (const chunk of lib(url, {request: teenyRequest})) body += chunk; return body; }, validate: value => assert.equal(value, 'ok')});
  await require('../../../scripts/bench-paired.cjs').run({root: path.resolve(__dirname, '..'), upstream, vpm, cases,
    files: ['index.js', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', '../../scripts/retry-request-conformance/package-lock.json', '../../scripts/retry-request-conformance/node_modules/retry-request/index.js', '../../scripts/retry-request-conformance/node_modules/extend/index.js', '../../scripts/retry-request-conformance/node_modules/teeny-request/build/src/index.js'],
    cleanup: async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }});
})().catch(error => { server?.close(); console.error(error); process.exitCode = 1; });
