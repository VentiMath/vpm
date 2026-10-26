'use strict';
const path = require('node:path');
const compare = require('../../../scripts/compare.cjs');
const finalhandler = require('..');
const { Response } = require('../test/helpers.cjs');
const reference = process.argv[2] && path.resolve(process.argv[2]);
const upstream = reference ? require(reference) : require('../test/load-upstream.cjs');

console.log(reference
  ? 'Full upstream stack: ' + reference
  : 'Pinned finalhandler 2.1.1 with shared VPM primitives (handler-only comparison).');
console.log('Fresh completed request and in-memory response per call; no sockets or request draining.');

function execute(handler, input) {
  const req = { url: input.url, method: input.method || 'GET', httpVersionMajor: 1,
    complete: true, readable: false, socket: { readable: true, writable: true } };
  const res = new Response();
  handler(req, res, { env: input.env || 'production' })(input.error);
  return res.body;
}

compare([
  ['short 404', { url: '/missing?query=1' }],
  ['long 404', { url: '/' + 'a'.repeat(8192) + '/&tail' }],
  ['production error', { error: { status: 500 } }],
  ['development stack', { env: 'development', error: { stack: 'Error: failed\n' +
    ('    at handle (/workspace/' + 'module'.repeat(8) + '.js:10:1)\n').repeat(16) } }],
  ['HEAD error', { method: 'HEAD', error: { status: 403 } }],
].map(([name, input]) => ({ name, inputs: [input], before: value => execute(upstream, value),
  after: value => execute(finalhandler, value) })));
