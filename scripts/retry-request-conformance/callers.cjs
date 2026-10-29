'use strict';
const assert = require('node:assert/strict'), http = require('node:http');
const {PassThrough} = require('node:stream');
const {createRequire} = require('node:module');
const {spawnSync} = require('node:child_process');

module.exports = async function checkCallers(library = require('../../packages/vretry-request')) {
  let used = 0;
  function counted(...args) { used++; return library(...args); }
  Object.assign(counted, library);
  for (const caller of ['@google-cloud/storage', 'google-gax']) {
    const from = createRequire(require.resolve(caller));
    const entry = from.resolve('retry-request');
    assert.equal(from('retry-request/package.json').version, '9.1.0');
    require(entry); require.cache[entry].exports = counted;
  }
  const storage = require('./node_modules/@google-cloud/storage/build/cjs/src/nodejs-common/util.js').util;
  const {StreamProxy, StreamType} = require('./node_modules/google-gax/build/src/streamingCalls/streaming.js');
  const duplexify = require('duplexify');
  const counts = new Map();
  const server = http.createServer((req, res) => {
    const count = (counts.get(req.url) || 0) + 1; counts.set(req.url, count);
    res.statusCode = count === 1 && !(process.argv.includes('--control-success') && req.url === '/stream') ? 503 : 200;
    res.end(res.statusCode === 503 ? 'unavailable' : 'ok');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const uri = 'http://127.0.0.1:' + server.address().port;
  const config = {maxRetries: 1, retryOptions: {maxRetryDelay: 0.001}};
  try {
    const body = await new Promise((resolve, reject) => storage.makeRequest({uri: uri + '/callback'}, config, (err, body) => err ? reject(err) : resolve(body)));
    assert.equal(body, 'ok'); assert.equal(counts.get('/callback'), 2);
    const output = duplexify(undefined, undefined, {writable: false});
    const stream = storage.makeRequest({uri: uri + '/stream', method: 'GET'}, {...config, stream: output});
    let data = ''; for await (const chunk of stream) data += chunk;
    assert.equal(data, 'ok'); assert.equal(counts.get('/stream'), process.argv.includes('--control-success') ? 1 : 2);

    // Exercise the retry-request branch, not gax's newer independent retry loop.
    const previous = library.defaults.maxRetryDelay; library.defaults.maxRetryDelay = 0.001;
    let attempts = 0, resends = 0;
    try {
      const proxy = new StreamProxy(StreamType.SERVER_STREAMING, () => {}, false, false);
      proxy.recordResend = () => resends++;
      proxy.setStream(() => {
        const source = new PassThrough({objectMode: true}); source.cancel = () => source.destroy();
        attempts++;
        setImmediate(() => {
          if (attempts === 1) source.emit('error', Object.assign(new Error('unavailable'), {code: 14}));
          else { source.emit('response', {statusCode: 200}); source.end({value: 'ok'}); }
        });
        return source;
      }, {}, {noResponseRetries: 1, retries: 1});
      const values = []; for await (const value of proxy) values.push(value);
      assert.deepEqual(values, [{value: 'ok'}]); assert.equal(attempts, 2); assert.equal(resends, 1);
    } finally { library.defaults.maxRetryDelay = previous; }
    assert.equal(used, 3);
    console.log('Cloud Storage 8.4.0 callback/download and google-gax 6.14.0 retry-request stream paths passed.');
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
};
if (require.main === module) {
  if (process.argv.includes('--check-control')) {
    const broken = spawnSync(process.execPath, [__filename, '--upstream'], {encoding: 'utf8', timeout: 30000});
    assert.notEqual(broken.status, 0);
    assert.match(broken.stderr, /ERR_STREAM_UNABLE_TO_PIPE/);
    const success = spawnSync(process.execPath, [__filename, '--upstream', '--control-success'], {encoding: 'utf8', timeout: 30000});
    assert.equal(success.status, 0, success.stdout + success.stderr);
    console.log('Upstream control: callback/gax retries and successful download pass; rejected download reproduces ERR_STREAM_UNABLE_TO_PIPE.');
  } else module.exports(process.argv.includes('--upstream') ? require('retry-request') : undefined)
    .catch(error => { console.error(error); process.exitCode = 1; });
}
