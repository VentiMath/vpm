'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const zlib = require('node:zlib');
const {once} = require('node:events');
const {Readable} = require('node:stream');
const upstream = require('../../../scripts/consumers/node_modules/gaxios');
const vpm = require('..');
const cases = [];
const payload = Buffer.from(JSON.stringify({ok: true, message: 'x'.repeat(1024)}));
const defaults = {headers: {'x-client': 'benchmark'}, noProxy: ['*']};
const response = (config, data) => ({config, data, status: 200, statusText: 'OK', headers: {}, request: {responseURL: String(config.url)}});
function add(name, make, validate, async = true) { cases.push({name, make, validate, async}); }
add('client construction', lib => () => new lib.Gaxios(defaults), result => assert.equal(result.defaults.headers['x-client'], 'benchmark'), false);
for (const method of ['GET', 'POST']) {
  add('adapter ' + method, lib => {
    const client = new lib.Gaxios(defaults);
    const options = {url: 'http://example.test/path', method, params: {q: 'a b'}, responseType: 'json', adapter: async config => response(config, config.body || 'ok')};
    if (method === 'POST') options.data = {ok: true};
    return () => client.request(options);
  }, result => { assert.equal(result.status, 200); assert.equal(result.data, method === 'POST' ? '{"ok":true}' : 'ok'); });
}
(async () => {
  const gzip = zlib.gzipSync(payload);
  const server = http.createServer((request, reply) => {
    if (request.method === 'POST') { request.pipe(reply); return; }
    reply.setHeader('content-type', 'application/json');
    if (request.url === '/gzip') reply.setHeader('content-encoding', 'gzip');
    if (request.url === '/error') reply.statusCode = 503;
    reply.end(request.url === '/gzip' ? gzip : payload);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  const agents = [];
  function makeClient(lib) {
    const agent = new http.Agent({keepAlive: true});
    agents.push(agent);
    return new lib.Gaxios({...defaults, agent});
  }
  for (const route of ['/json', '/gzip']) add('HTTP ' + route, lib => {
    const client = makeClient(lib);
    return () => client.request({url: url + route, responseType: 'json'});
  }, result => assert.equal(result.data.ok, true));
  // Bun resolves bare node-fetch imports to its built-in compatibility module.
  // Keep the installed default baseline and separately compare pinned Fetch 2.
  for (const route of ['/json', '/gzip']) add('pinned Fetch 2 ' + route, lib => {
    const client = makeClient(lib);
    const fetchImplementation = lib === upstream ? require('../../../scripts/consumers/node_modules/node-fetch') : require('../../vnode-fetch');
    return () => client.request({url: url + route, responseType: 'json', fetchImplementation});
  }, result => assert.equal(result.data.ok, true));
  add('HTTP JSON POST', lib => {
    const client = makeClient(lib);
    return () => client.request({url, method: 'POST', data: {ok: true}, responseType: 'json'});
  }, result => assert.equal(result.data.ok, true));
  add('HTTP multipart upload', lib => {
    const client = makeClient(lib);
    return () => client.request({url, method: 'POST', multipart: [{headers: {'Content-Type': 'text/plain'}, content: Readable.from(['upload'])}], responseType: 'text'});
  }, result => assert.match(result.data, /Content-Type: text\/plain\r\n\r\nupload\r\n/));
  add('HTTP 503 error', lib => {
    const client = makeClient(lib);
    return async () => { try { await client.request({url: url + '/error', responseType: 'json'}); return null; } catch (error) { return error; } };
  }, error => { assert.equal(error.status, 503); assert.equal(error.response.data.ok, true); });
  const fs = require('node:fs');
  await require('../../../scripts/bench-paired.cjs').run({
    root: path.resolve(__dirname, '..'), upstream, vpm, cases,
    files: ['index.js', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', ...fs.readdirSync(path.join(__dirname, '../lib')).filter(file => file.endsWith('.js')).map(file => 'lib/' + file), '../vnode-fetch/index.js', '../vextend/index.js', '../vis-stream/index.js', '../../scripts/consumers/node_modules/gaxios/build/src/gaxios.js', '../../scripts/consumers/node_modules/node-fetch/lib/index.js', '../../scripts/consumers/package-lock.json'],
    cleanup: async () => { for (const agent of agents) agent.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  });
  if (process.env.OUTPUT) {
    const report = JSON.parse(fs.readFileSync(process.env.OUTPUT));
    report.upstreamFetchResolution = require.resolve('node-fetch', {paths: [require.resolve('../../../scripts/consumers/node_modules/gaxios')]});
    report.transportComparison = 'Default HTTP cases use each installed client unchanged; pinned Fetch 2 cases explicitly select the published node-fetch 2.7.0 bundle and vnode-fetch. Bun supplies a built-in module for bare node-fetch imports.';
    fs.writeFileSync(process.env.OUTPUT, JSON.stringify(report, null, 2) + '\n');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
