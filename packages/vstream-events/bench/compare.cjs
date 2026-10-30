'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http');
const {EventEmitter} = require('node:events'), {PassThrough} = require('node:stream');
const upstream = require('../../../scripts/retry-request-conformance/node_modules/stream-events'), vpm = require('..');
function read() {this.calls++; return 42;}
function write() {this.calls++; return 42;}
function fixture() {const s = new EventEmitter(); s.calls = 0; s._read = read; s._write = write; return s;}
const cases = [
  {name: 'decorate own methods', async: false, make: lib => () => lib(fixture()), validate: value => assert.equal(value.calls, 0)},
  {name: 'decorate native PassThrough', async: false, make: lib => () => lib(new PassThrough()), validate: value => assert.equal(typeof value._read, 'function')},
  {name: 'decorate and first read/write', async: false, make: lib => () => {const s = lib(fixture()); s._read(16384); s._write('value', 'utf8', () => {}); return s.calls;}, validate: value => assert.equal(value, 2)},
  {name: 'decorate and notify read/write', async: false, make: lib => () => {const s = fixture(); let events = 0; s.on('reading', () => events++); s.on('writing', () => events++); lib(s); s._read(16384); s._write('value', 'utf8', () => {}); return s.calls + events;}, validate: value => assert.equal(value, 4)},
  {name: '100 reads after first notification', async: false, make: lib => {const s = lib(fixture()); s._read(16384); return () => {s.calls = 0; for(let i = 0; i < 100; i++) s._read(16384); return s.calls;};}, validate: value => assert.equal(value, 100)},
];
for (const objectMode of [false, true]) cases.push({name: objectMode ? '32 object native stream' : '32 chunk native stream', async: true,
  make: lib => {const chunks = objectMode ? Array(32).fill({value: 1}) : Array(32).fill(Buffer.alloc(512)); return async () => {
    const stream = lib(new PassThrough({objectMode})); let total = 0;
    const consumed = (async () => {for await (const chunk of stream) total += objectMode ? 1 : chunk.length;})();
    for(const chunk of chunks) stream.write(chunk); stream.end(); await consumed; return total;
  };}, validate: value => assert.equal(value, objectMode ? 32 : 16384)});
let server;
(async () => {
  server = http.createServer((req, res) => res.end('ok'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  cases.push({name: 'teeny-request HTTP stream', async: true, make: lib => {
    const request = require('../../../scripts/stream-events-conformance/transport.cjs')(lib);
    return async () => {let body = ''; for await (const chunk of request({url})) body += chunk; return body;};
  }, validate: value => assert.equal(value, 'ok')});
  await require('../../../scripts/bench-paired.cjs').run({root: path.resolve(__dirname, '..'), upstream, vpm, cases,
    files: ['index.js', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', '../../scripts/stream-events-conformance/transport.cjs', '../../scripts/retry-request-conformance/package-lock.json', '../../scripts/retry-request-conformance/node_modules/stream-events/index.js', '../../scripts/retry-request-conformance/node_modules/stubs/index.js', '../../scripts/retry-request-conformance/node_modules/teeny-request/build/src/index.js'],
    cleanup: async () => {server.closeAllConnections(); await new Promise(resolve => server.close(resolve));}});
})().catch(error => {server?.close(); console.error(error); process.exitCode = 1;});
