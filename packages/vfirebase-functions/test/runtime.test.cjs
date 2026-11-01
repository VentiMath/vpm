'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const trace = require('../lib/common/trace.js'), {wrapTraceContext} = require('../lib/v2/trace.js');
const loader = require('../lib/runtime/loader.js');
const traceId = '0af7651916cd43dd8448eb211c80319c', parentId = 'b7ad6b7169203331';
const carrier = flags => ({traceparent: `00-${traceId}-${parentId}-${flags}`});
const endpoint = () => Object.assign(() => {}, {__endpoint: {platform: 'gcfv2', httpsTrigger: {}}});
const extract = module => {const endpoints = {}, apis = [], extensions = {}; loader.extractStack(module, endpoints, apis, extensions); return {endpoints, apis, extensions};};

test('trace parsing preserves unsigned 64-bit Google span IDs without floating-point rounding', () => {
  for (const decimal of ['1', '2450465917091935019', '18446744073709551615']) {
    const result = trace.extractTraceContext({'X-CLOUD-TRACE-CONTEXT': `${traceId}/${decimal};o=1`});
    assert.equal(result.parentId, BigInt(decimal).toString(16));
    assert.equal(result.sample, true);
  }
  assert.equal(trace.extractTraceContext({'x-cloud-trace-context': `${traceId}/18446744073709551616;o=1`}), undefined);
});
test('traceparent validates identifiers and treats sampling as a bit, with portable-header precedence', () => {
  assert.equal(trace.extractTraceContext(carrier('09')).sample, true);
  assert.equal(trace.extractTraceContext(carrier('02')).sample, false);
  assert.equal(trace.extractTraceContext(new Headers(carrier('01'))).traceId, traceId);
  assert.equal(trace.extractTraceContext({TraceParent: carrier('01').traceparent}).traceId, traceId);
  assert.equal(trace.extractTraceContext({...carrier('01'), 'x-cloud-trace-context': '1'.repeat(32) + '/1'}).traceId, traceId);
  for (const value of [`ff-${traceId}-${parentId}-01`, `00-${'0'.repeat(32)}-${parentId}-01`, `00-${traceId}-${'0'.repeat(16)}-01`, carrier('01').traceparent + '-extra']) {
    assert.equal(trace.extractTraceContext({traceparent: value}), undefined);
  }
  assert.equal(trace.extractTraceContext({traceparent: carrier('01').traceparent.replace(/^00/, '01') + '-extra'}).traceId, traceId);
});
test('concurrent traced handlers preserve the receiver and isolate their async context', async () => {
  const handler = wrapTraceContext(async function (request, response) {
    await Promise.resolve();
    return [this, response, trace.traceContext.getStore()?.traceId];
  });
  const receiver = {}, response = {};
  const [first, second] = await Promise.all([
    handler.call(receiver, {headers: carrier('01')}, response),
    handler.call(receiver, {headers: {traceparent: `00-${'1'.repeat(32)}-${parentId}-01`}}, response),
  ]);
  assert.deepEqual(first, [receiver, response, traceId]); assert.deepEqual(second, [receiver, response, '1'.repeat(32)]);
  assert.equal(trace.traceContext.getStore(), undefined);
});
test('discovery rejects ancestor cycles and endpoint collisions but preserves shared groups and prototype names', () => {
  const group = {fn: endpoint()};
  const result = extract({one: group, two: group, ['__proto__']: endpoint()});
  assert.deepEqual(Object.keys(result.endpoints), ['one-fn', 'two-fn', '__proto__']);
  assert.equal(Object.getPrototypeOf(result.endpoints), Object.prototype);
  const cyclic = {}; cyclic.self = cyclic;
  assert.throws(() => extract(cyclic), /Circular function export group/);
  assert.throws(() => extract({'one-fn': endpoint(), one: group}), /Duplicate function endpoint/);
  assert.deepEqual(loader.mergeRequiredAPIs([{api: '__proto__', reason: 'a'}, {api: '__proto__', reason: 'b'}]), [{api: '__proto__', reason: 'a b'}]);
});
test('deep deployment groups are traversed without recursive stack growth', () => {
  let nested = {fn: endpoint()};
  for (let depth = 0; depth < 12000; depth++) nested = {g: nested};
  const endpoints = extract(nested).endpoints;
  assert.equal(Object.keys(endpoints).length, 1);
  assert.equal(Object.values(endpoints)[0].entryPoint, 'g.'.repeat(12000) + 'fn');
});
test('legacy compatibility values memoize own prototype-named and undefined fields', () => {
  const {addV1Compat} = require('../lib/v2/compat.js'); let calls = 0;
  const result = addV1Compat({}, {['__proto__']: () => (++calls, undefined)});
  assert.equal(result.__proto__, undefined); assert.equal(result.__proto__, undefined); assert.equal(calls, 1);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
});
test('configuration accepts leading JSON whitespace and file paths without PWD', () => {
  const config = require('../lib/common/config.js');
  const prior = {FIREBASE_CONFIG: process.env.FIREBASE_CONFIG, PWD: process.env.PWD};
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-runtime-config-'));
  try {
    process.env.FIREBASE_CONFIG = '  {"projectId":"inline"}'; config.resetCache();
    assert.deepEqual(config.firebaseConfig(), {projectId: 'inline'});
    const file = path.join(directory, 'config.json'); fs.writeFileSync(file, '{"projectId":"file"}');
    delete process.env.PWD; process.env.FIREBASE_CONFIG = file; config.resetCache();
    assert.deepEqual(config.firebaseConfig(), {projectId: 'file'});
  } finally {
    for (const [key, value] of Object.entries(prior)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    config.resetCache(); fs.rmSync(directory, {recursive: true, force: true});
  }
});
test('runtime CJS and ESM entry points share loader, app, config and trace identity', async () => {
  for (const [file, name] of [['runtime/loader', 'loadStack'], ['common/config', 'firebaseConfig'], ['common/app', 'getApp'], ['v2/trace', 'wrapTraceContext'], ['v2/compat', 'addV1Compat']]) {
    assert.equal((await import(`../lib/esm/${file}.mjs`))[name], require(`../lib/${file}.js`)[name]);
  }
});
test('Admin app selection preserves the same instance and propagates unexpected registry errors', () => {
  const {spawnSync} = require('node:child_process');
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const admin = require('./packages/vfirebase-admin/lib/app/index.js'), selection = require('./packages/vfirebase-functions/lib/common/app.js');
    const app = admin.initializeApp({projectId: 'vpm-selection'}, '__FIREBASE_FUNCTIONS_SDK__');
    selection.setApp(app); selection.setApp(app);
    assert.equal(selection.getApp(), app);
    assert.equal(admin.getApps().includes(app), true);
    selection.setApp(undefined);
    const original = Object.getOwnPropertyDescriptor(admin, 'getApp');
    Object.defineProperty(admin, 'getApp', {configurable: true, value: () => {throw new Error('registry unavailable');}});
    assert.throws(() => selection.getApp(), /registry unavailable/);
    Object.defineProperty(admin, 'getApp', original);
  `], {cwd: path.resolve(__dirname, '../../..'), encoding: 'utf8'});
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
test('native deployment discovery serves manifests, rejects other routes and shuts down explicitly', async () => {
  const {once} = require('node:events');
  const {createDiscoveryServer} = require('../lib/runtime/discovery-server.js');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-discovery-'));
  fs.writeFileSync(path.join(directory, 'index.js'), "module.exports = {api: Object.assign(() => {}, {__endpoint: {platform: 'gcfv2', httpsTrigger: {}}})};");
  const server = createDiscoveryServer(directory, true);
  try {
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    const response = await fetch(base + '/__/functions.yaml?cache=false');
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /^text\/yaml/);
    assert.equal((await response.json()).endpoints.api.entryPoint, 'api');
    const head = await fetch(base + '/__/functions.yaml', {method: 'HEAD'});
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    assert.equal((await fetch(base + '/not-a-control-route')).status, 404);
    const closed = once(server, 'close');
    assert.equal(await (await fetch(base + '/__/quitquitquit', {method: 'POST'})).text(), 'ok');
    await closed;
  } finally {server.closeAllConnections(); if (server.listening) await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, {recursive: true, force: true});}
});
