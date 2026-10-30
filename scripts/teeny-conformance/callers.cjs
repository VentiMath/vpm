'use strict';
const assert = require('node:assert/strict'), http = require('node:http'), {createRequire} = require('node:module');
const fixture = createRequire(require.resolve('../retry-request-conformance/node_modules/@google-cloud/storage/package.json'));
module.exports = async function checkCallers(library = require('../../packages/vteeny-request')) {
  const teenyEntry = fixture.resolve('teeny-request'), retryEntry = fixture.resolve('retry-request');
  const previousTeeny = require(teenyEntry), previousRetry = require(retryEntry);
  const {teenyRequest} = library; let uses = 0;
  const counted = (...args) => {uses++; return teenyRequest(...args);};
  counted.defaults = options => {const request = teenyRequest.defaults(options); return (...args) => {uses++; return request(...args);};};
  require.cache[teenyEntry].exports = {...library, teenyRequest: counted};
  // Hold retries constant: upstream retry-request fails on rejected downloads.
  require.cache[retryEntry].exports = require('../../packages/vretry-request');
  const utilEntry = fixture.resolve('./build/cjs/src/nodejs-common/util.js');
  const previousUtil = require.cache[utilEntry]; delete require.cache[utilEntry];
  const storage = require(utilEntry).util, duplexify = fixture('duplexify');
  const counts = new Map(); let uploaded;
  const server = http.createServer(async (req, res) => {
    const count = (counts.get(req.url) || 0) + 1; counts.set(req.url, count);
    if (req.url.startsWith('/upload')) {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      uploaded = {body: Buffer.concat(chunks), headers: req.headers, url: req.url};
      res.setHeader('Content-Type', 'application/json'); res.end('{"name":"example.bin","size":"5"}'); return;
    }
    res.statusCode = count === 1 ? 503 : 200; res.end(count === 1 ? 'unavailable' : 'ok');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const uri = 'http://127.0.0.1:' + server.address().port, config = {maxRetries: 1, retryOptions: {maxRetryDelay: 0.001}};
  try {
    const body = await new Promise((resolve, reject) => storage.makeRequest({uri: uri + '/callback'}, config, (e, b) => e ? reject(e) : resolve(b)));
    assert.equal(body, 'ok'); assert.equal(counts.get('/callback'), 2);
    const download = duplexify(undefined, undefined, {writable: false}); storage.makeRequest({uri: uri + '/download'}, {...config, stream: download});
    let received = ''; for await (const chunk of download) received += chunk;
    assert.equal(received, 'ok'); assert.equal(counts.get('/download'), 2);
    const upload = duplexify(undefined, undefined, {readable: false});
    const result = new Promise((resolve, reject) => {
      upload.on('error', reject);
      storage.makeWritableStream(upload, {request: {uri: uri + '/upload', qs: {name: 'example.bin'}}, metadata: {name: 'example.bin', contentType: 'application/octet-stream'}, makeAuthenticatedRequest(opts, auth) {auth.onAuthenticated(null, opts);}}, resolve);
    });
    const bytes = Buffer.from([0, 255, 1, 2, 3]); upload.end(bytes);
    assert.deepEqual(await result, {name: 'example.bin', size: '5'});
    assert.equal(uploaded.url, '/upload?uploadType=multipart&name=example.bin');
    const boundary = uploaded.headers['content-type'].split('boundary=')[1];
    assert.deepEqual(uploaded.body, Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n{"name":"example.bin","contentType":"application/octet-stream"}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--`)]));
    assert.equal(uses, 5);
    console.log('Cloud Storage 8.4.0: callback retry, download retry and streamed multipart upload passed through teeny-request; 5 requests verified.');
  } finally {
    teenyRequest.close?.();
    if (!teenyRequest.close) {const pool = fixture('teeny-request/build/src/agents.js').pool; for (const agent of pool.values()) agent.destroy(); pool.clear();}
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    require.cache[teenyEntry].exports = previousTeeny; require.cache[retryEntry].exports = previousRetry;
    if (previousUtil) require.cache[utilEntry] = previousUtil; else delete require.cache[utilEntry];
  }
};
if (require.main === module) module.exports(process.argv.includes('--upstream') ? fixture('teeny-request') : undefined).catch(error => {console.error(error); process.exitCode = 1;});
