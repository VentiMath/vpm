'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), http = require('node:http');
const {run} = require('../../../scripts/bench-paired.cjs');
const upstream = require('../../../scripts/http-proxy-conformance/node_modules/http-proxy-agent/dist/index.js'), vpm = require('..');
const {proxy, request, start} = require('../test/helpers.cjs');
const cases = [], agents = [], cleanups = [], lifecycle = {after: close => cleanups.push(close)};
const add = (name, make, validate, async = false) => cases.push({name, make, validate, async});
for (const [name, url, options] of [
  ['construct plain', 'http://localhost:8080', {}],
  ['construct authenticated', 'https://alice:p%40ss@localhost:8080', {keepAlive: true}],
  ['construct custom headers', 'http://localhost:8080', {headers: {'X-Project': 'test', 'Proxy-Authorization': 'Bearer example'}}],
]) add(name, lib => () => new lib.HttpProxyAgent(url, options), a => assert.equal(a.proxy.hostname, 'localhost'));
for (const [name, input, options] of [
  ['prepare simple target', '/a', {}],
  ['prepare complex target', '/folder/a%20b/c%2Fz?query=a%2Bb&next=%2F', {}],
  ['prepare authenticated headers', '/a', {headers: {'X-Project': 'test'}}],
  ['prepare dynamic headers', '/a', {headers: () => ({'X-Project': 'test'})}],
]) add(name, lib => {
  const a = new lib.HttpProxyAgent(name === 'prepare authenticated headers' ? 'http://alice:pass@localhost:8080' : 'http://localhost:8080', options); agents.push(a);
  return () => {
    const headers = {host: 'destination.test:8080'};
    const req = {path: input, getHeader: name => headers[name.toLowerCase()], setHeader: (name, value) => headers[name.toLowerCase()] = value};
    a.setRequestProps(req, {host: 'destination.test', port: 8080}); return {path: req.path, headers};
  };
}, result => {assert.equal(result.path, 'http://destination.test:8080' + input.split('#')[0]); if (name === 'prepare authenticated headers') assert.match(result.headers['proxy-authorization'], /^Basic /); else assert.equal(result.headers['proxy-authorization'], undefined);});
(async () => {
  const origin = await start(lifecycle, http.createServer((req, res) => req.method === 'POST' ? req.pipe(res) : res.end('ok')));
  const uri = 'http://127.0.0.1:' + origin.address().port;
  const forwardingAgent = new http.Agent({keepAlive: true}); agents.push(forwardingAgent);
  const plain = await proxy(lifecycle, false, undefined, forwardingAgent), secure = await proxy(lifecycle, true, undefined, forwardingAgent);
  for (const [name, p, keepAlive] of [
    ['HTTP proxy keep-alive GET', plain, true], ['HTTP proxy fresh GET', plain, false],
    ['TLS proxy keep-alive GET', secure, true], ['TLS proxy fresh GET', secure, false],
  ]) add(name, lib => {const a = new lib.HttpProxyAgent(p.url, {keepAlive, rejectUnauthorized: false}); agents.push(a); return () => request(uri, {agent: a});}, result => {assert.equal(result.status, 200); assert.equal(result.body.toString(), 'ok');}, true);
  add('HTTP GET with a new agent', lib => async () => {const a = new lib.HttpProxyAgent(plain.url); try {return await request(uri, {agent: a});} finally {a.destroy();}}, result => assert.equal(result.body.toString(), 'ok'), true);
  const body = Buffer.alloc(64 * 1024, 197), chunks = Array.from({length: 8}, (_, i) => body.subarray(i * 8192, (i + 1) * 8192));
  add('64KiB streamed POST, eight chunks', lib => {const a = new lib.HttpProxyAgent(plain.url, {keepAlive: true}); agents.push(a); return () => request(uri, {agent: a, method: 'POST'}, chunks);}, result => {assert.equal(result.status, 200); assert.equal(result.body.length, body.length); assert(result.body.equals(body));}, true);
  add('eight queued GETs', lib => {const a = new lib.HttpProxyAgent(plain.url, {keepAlive: true, maxSockets: 1}); agents.push(a); return () => Promise.all(Array.from({length: 8}, () => request(uri, {agent: a})));}, values => {assert.equal(values.length, 8); for (const value of values) assert.equal(value.body.toString(), 'ok');}, true);
  await run({root: path.resolve(__dirname, '..'), upstream, vpm, cases,
    files: ['index.js','index.d.ts','lib/options.js','lib/request.js','package.json','PROVENANCE.json','bench/compare.cjs','test/helpers.cjs',
      '../vhttps-proxy-agent/test/helpers.cjs','../vagent-base/index.js','../vagent-base/helpers.js','../vagent-base/test/tls-key.pem','../vagent-base/test/tls-cert.pem','../vdebug/index.js','../vms/index.js',
      '../../scripts/http-proxy-conformance/package-lock.json',
      ...['http-proxy-agent','agent-base','proxy-agent-negotiate'].flatMap(pkg => ['package.json','dist/index.js'].map(file => '../../scripts/http-proxy-conformance/node_modules/' + pkg + '/' + file)),
      ...['index.js','common.js','node.js'].map(file => '../../scripts/http-proxy-conformance/node_modules/debug/src/' + file),
      '../../scripts/http-proxy-conformance/node_modules/ms/index.js'],
    cleanup: async () => {for (const a of agents) a.destroy(); for (const close of cleanups.reverse()) await close();}
  });
})().catch(error => {console.error(error); process.exitCode = 1;});
