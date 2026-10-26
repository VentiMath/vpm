'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { performance } = require('node:perf_hooks');
const { request } = require('../test/helpers.cjs');
const before = process.argv[2] ? require(path.resolve(process.argv[2])) : require('../test/upstream.cjs');
const after = require('..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vsend-bench-'));
fs.writeFileSync(path.join(directory, 'data.bin'), Buffer.alloc(4096, 97));
const servers = [before, after].map(implementation => http.createServer((req, res) => implementation(req, '/data.bin', { root: directory }).pipe(res)));
const agents = servers.map(() => new http.Agent({ keepAlive: true, maxSockets: 1 }));
let checksum = 0;
async function measure(index, options, count) {
  const start = performance.now();
  for (let i = 0; i < count; i++) {
    const result = await request(servers[index], '/', { ...options, agent: agents[index] });
    checksum += result.body.length + result.status;
  }
  return (performance.now() - start) * 1000 / count;
}
(async () => {
  try {
    for (const server of servers) await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const rows = [];
    for (const [name, options] of [
      ['4 KiB file GET', {}], ['HEAD', { method: 'HEAD' }],
      ['single range', { headers: { range: 'bytes=0-1023' } }], ['304', { headers: { 'if-none-match': '*' } }],
    ]) {
      const results = await Promise.all(servers.map((server, index) => request(server, '/', { ...options, agent: agents[index] })));
      for (const result of results) delete result.headers.date;
      assert.deepEqual(results[1], results[0]);
      for (let index = 0; index < 2; index++) await measure(index, options, 50);
      const samples = [[], []];
      for (let round = 0; round < 7; round++) for (const index of round % 2 ? [1, 0] : [0, 1]) samples[index].push(await measure(index, options, 200));
      const [old, next] = samples.map(values => values.sort((a, b) => a - b)[3]);
      rows.push({ case: name, 'upstream μs/request': +old.toFixed(1), 'VPM μs/request': +next.toFixed(1), 'VPM / upstream': +(next / old).toFixed(2) });
    }
    console.log(`Runtime: ${process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version}`);
    console.log(process.argv[2] ? 'Baseline: installed send stack at ' + path.resolve(process.argv[2]) : 'Baseline: upstream send fixture with shared VPM primitives');
    console.log('Median of 7 alternating samples of 200 sequential requests; keep-alive, warm file cache, localhost HTTP.');
    console.table(rows); console.log('Checksum:', checksum);
  } finally {
    for (const agent of agents) agent.destroy();
    for (const server of servers) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
