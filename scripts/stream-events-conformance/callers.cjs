'use strict';
const assert = require('node:assert/strict'), http = require('node:http'), path = require('node:path');
const {once} = require('node:events'), {createRequire} = require('node:module');
const fixture = createRequire(path.resolve(__dirname, '../retry-request-conformance/package.json'));
module.exports = async function checkCallers(decorator = require('../../packages/vstream-events'), upstream = false, includeSDK = true) {
  let uses = 0;
  const teeny = require('./transport.cjs')(function counted(stream) { uses++; return decorator(stream); });
  const body = Buffer.alloc(128 * 1024, 65);
  const server = http.createServer((req, res) => res.end(body));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const output = teeny({url: 'http://127.0.0.1:' + server.address().port});
    let reads = 0, writes = 0;
    output.on('reading', () => reads++).on('writing', () => writes++);
    await once(output, 'response');
    assert.equal(reads, 0); assert.equal(output.readableLength, 0);
    const chunks = []; for await (const chunk of output) chunks.push(chunk);
    assert.deepEqual(Buffer.concat(chunks), body);
    assert.equal(reads, 1);
    if (!upstream) assert.equal(writes, 1); else assert(writes > 0);
    assert.equal(uses, 1);
  } finally {server.closeAllConnections(); await new Promise(resolve => server.close(resolve));}

  // Storage captures teeny-request at import time; substitute before loading it.
  const entry = fixture.resolve('stream-events'); fixture('stream-events');
  const previous = require.cache[entry].exports;
  require.cache[entry].exports = decorator;
  try {
    if (includeSDK) await require('../retry-request-conformance/callers.cjs')();
  } finally { require.cache[entry].exports = previous; }
  console.log('teeny-request 11.1.1 lazy reads and exact body streaming passed with ' + (upstream ? 'upstream stream-events' : 'vstream-events') + '.');
};
if (require.main === module) module.exports(process.argv.includes('--upstream') ? fixture('stream-events') : undefined, process.argv.includes('--upstream'))
  .catch(error => {console.error(error); process.exitCode = 1;});
