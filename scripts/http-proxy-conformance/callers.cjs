'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http');
const {createRequire} = require('node:module');
const fixture = createRequire(path.resolve(__dirname, '../retry-request-conformance/package.json'));
const fromTeeny = createRequire(fixture.resolve('teeny-request'));
const {start, proxy} = require('../../packages/vhttp-proxy-agent/test/helpers.cjs');
module.exports = async function checkCallers(library = require('../../packages/vhttp-proxy-agent')) {
  const entry = fromTeeny.resolve('http-proxy-agent'); fromTeeny('http-proxy-agent');
  assert.equal(fromTeeny('http-proxy-agent/package.json').version, '7.0.2');
  const previous = require.cache[entry].exports, agents = [], cleanups = [];
  class Counted extends library.HttpProxyAgent {constructor(...args) {super(...args); agents.push(this);}}
  require.cache[entry].exports = {HttpProxyAgent: Counted};
  const lifecycle = {after: close => cleanups.push(close)};
  try {
    const body = Buffer.alloc(128 * 1024, 197);
    const origin = await start(lifecycle, http.createServer((req, res) => {
      assert.equal(req.headers['proxy-authorization'], undefined);
      if (req.method === 'POST') req.pipe(res); else res.end(body);
    }));
    const uri = 'http://127.0.0.1:' + origin.address().port;
    const {teenyRequest} = fixture('teeny-request');
    const storage = fixture('./node_modules/@google-cloud/storage/build/cjs/src/nodejs-common/util.js').util;
    const duplexify = fixture('duplexify');
    for (const secure of [false, true]) {
      const p = await proxy(lifecycle, secure);
      const options = {proxy: p.url.replace('://', '://alice:p%40ss@'), pool: {rejectUnauthorized: false}};
      const result = await new Promise((resolve, reject) => teenyRequest({uri: uri + '/post', method: 'POST', body, ...options}, (error, res, value) => error ? reject(error) : resolve({res, value})));
      assert.equal(result.res.statusCode, 200); assert.equal(result.value, body.toString());
      const streamed = teenyRequest({uri: uri + '/stream', ...options}), chunks = [];
      for await (const chunk of streamed) chunks.push(chunk);
      assert.deepEqual(Buffer.concat(chunks), body);
      const callback = await new Promise((resolve, reject) => storage.makeRequest({uri: uri + '/sdk-callback', ...options}, {maxRetries: 0}, (error, value) => error ? reject(error) : resolve(value)));
      assert.equal(callback, body.toString());
      const output = duplexify(undefined, undefined, {writable: false});
      const download = storage.makeRequest({uri: uri + '/sdk-download', method: 'GET', ...options}, {maxRetries: 0, stream: output});
      const downloaded = []; for await (const chunk of download) downloaded.push(chunk);
      assert.deepEqual(Buffer.concat(downloaded), body);
      assert.equal(p.requests.length, 4);
      for (const request of p.requests) assert.equal(request.headers['proxy-authorization'], 'Basic ' + Buffer.from('alice:p@ss').toString('base64'));
    }
    assert.equal(agents.length, 8);
    console.log('teeny-request 11.1.1 callback/stream and Cloud Storage 8.4.0 callback/download passed through HTTP and TLS forward proxies (8 constructed agents).');
  } finally {
    require.cache[entry].exports = previous;
    for (const agent of agents) agent.destroy();
    for (const close of cleanups.reverse()) await close();
  }
};
if (require.main === module) module.exports(process.argv.includes('--upstream') ? fromTeeny('http-proxy-agent') : undefined)
  .catch(error => {console.error(error); process.exitCode = 1;});
