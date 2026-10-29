'use strict';
// Isolate each server's JIT state, async context and CPU accounting.
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.argv[2];
const { getServer } = require(path.join(base, 'server'));
const options = require(path.join(base, 'options')).parseOptions(['node', 'framework'], {});
const cases = require('./workloads.cjs');
let server, cpu;
process.on('message', async message => {
  try {
    let result = {};
    switch (message.action) {
      case 'open': {
        assert.equal(server, undefined);
        const entry = cases.find(entry => entry.name === message.name); assert.ok(entry);
        server = getServer(entry.handler, { ...options, signatureType: entry.signatureType || 'http' });
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
        result.port = server.address().port;
        break;
      }
      case 'start': cpu = process.cpuUsage(); break;
      case 'stop': result = process.cpuUsage(cpu); break;
      case 'close':
        await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
        server = undefined; break;
      default: throw new Error('Unknown control command');
    }
    process.send({ id: message.id, ...result });
  } catch (error) { process.send({ id: message.id, error: error.stack || String(error) }); }
});
process.on('disconnect', () => { server?.closeAllConnections(); process.exit(0); });
process.send({ ready: true });
