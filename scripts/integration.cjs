'use strict';
// The integration gate. Aliases every VPM package into ventimath's pinned HTTP
// consumer upgrade target (scripts/consumers) inside this process only, then drives those
// consumers the way ventimath's Cloud Functions use them: an onRequest handler
// and an Express application served by the Functions Framework. Installed copies
// whose versions VPM does not target are reported, not aliased.
//
//   npm --prefix scripts/consumers ci --ignore-scripts
//   node scripts/integration.cjs [path/to/node_modules]
//   bun scripts/integration.cjs [path/to/node_modules]

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const { gzipSync } = require('node:zlib');
const { createRequire } = require('node:module');

process.env.GCLOUD_PROJECT ||= 'vpm-integration';
process.env.DEBUG = 'express:*,router:*,send,body-parser:*,finalhandler';
process.env.DEBUG_COLORS = '0';
process.env.DEBUG_HIDE_DATE = '1';
process.env.NODE_ENV ||= 'development';

const modules = path.resolve(process.argv[2] || path.join(__dirname, 'consumers/node_modules'));

// Upstream name -> VPM package and the upstream versions that package targets.
const targets = {
  'google-gax': {pkg:'vgoogle-gax',versions:/^6\.14\.0$/},
  '@opentelemetry/api': {pkg:'vopentelemetry-api',versions:/^1\.10\.0$/},
  '@grpc/grpc-js': {pkg:'vgrpc-js',versions:/^1\.14\.7$/},
  '@js-sdsl/ordered-map': {pkg:'vordered-map',versions:/^4\.4\.2$/},
  '@grpc/proto-loader': {pkg:'vgrpc-proto-loader',versions:/^0\.8\.1$/},
  'lodash.camelcase': {pkg:'vlodash.camelcase',versions:/^4\.3\.0$/},
  'proto3-json-serializer': {pkg:'vproto3-json-serializer',versions:/^4\.1\.0$/},
  protobufjs: {pkg:'vprotobufjs',versions:/^8\.8\.1$/},
  long: {pkg:'vlong',versions:/^5\.3\.2$/},
  'object-hash': {pkg:'vobject-hash',versions:/^3\.0\.0$/},
  '@google-cloud/storage': {pkg:'vgoogle-cloud-storage',versions:/^8\.4\.0$/},
  mime: {pkg:'vmime',versions:/^(?:3\.0\.0|4\.1\.2)$/},
  'fast-xml-parser': {pkg:'vfast-xml-parser',versions:/^5\.11\.2$/},
  'fast-xml-builder': {pkg:'vfast-xml-builder',versions:/^1\.3\.1$/,esm:true},
  '@nodable/entities': { pkg: 'vnodable-entities', versions: /^3\.1\.0$/, esm: true },
  'path-expression-matcher': { pkg: 'vpath-expression-matcher', versions: /^1\.6\.2$/, esm: true },
  'xml-naming': { pkg: 'vxml-naming', versions: /^0\.3\.0$/, esm: true },
  'is-unsafe': { pkg: 'vis-unsafe', versions: /^2\.0\.2$/, esm: true },
  anynum: { pkg: 'vanynum', versions: /^1\.0\.1$/, esm: true },
  strnum: { pkg: 'vstrnum', versions: /^2\.5\.1$/, esm: true },
  'html-entities': { pkg: 'vhtml-entities', versions: /^2\.6\.0$/ },
  retry: { pkg: 'vretry', versions: /^0\.13\.1$/ },
  'async-retry': { pkg: 'vasync-retry', versions: /^1\.3\.3$/ },
  'yocto-queue': { pkg: 'vyocto-queue', versions: /^(?:0\.1\.0|1\.2\.2)$/ },
  'p-limit': { pkg: 'vp-limit', versions: /^(?:3\.1\.0|7\.3\.3)$/ },
  '@google-cloud/promisify': { pkg: 'vpromisify', versions: /^6\.2\.1$/ },
  '@google-cloud/projectify': { pkg: 'vprojectify', versions: /^6\.2\.1$/ },
  '@google-cloud/paginator': { pkg: 'vpaginator', versions: /^7\.2\.0$/ },
  duplexify: { pkg: 'vduplexify', versions: /^4\.1\.3$/ },
  'teeny-request': { pkg: 'vteeny-request', versions: /^11\.1\.1$/ },
  'http-proxy-agent': { pkg: 'vhttp-proxy-agent', versions: /^(?:7\.0\.2|9\.1\.0)$/ },
  'stream-events': { pkg: 'vstream-events', versions: /^1\.0\.5$/ },
  'retry-request': { pkg: 'vretry-request', versions: /^9\.1\.0$/ },
  'google-auth-library': { pkg: 'vgoogle-auth-library', versions: /^11\.3\.2$/ },
  'gcp-metadata': { pkg: 'vgcp-metadata', versions: /^(?:6\.1\.1|8\.1\.2|9\.2\.3)$/ },
  'json-bigint': { pkg: 'vjson-bigint', versions: /^1\.0\.0$/ },
  'google-logging-utils': { pkg: 'vgoogle-logging-utils', versions: /^(?:0\.0\.2|2\.1\.1)$/ },
  gtoken: { pkg: 'vgtoken', versions: /^7\.1\.0$/ },
  gaxios: { pkg: 'vgaxios', versions: /^(?:7\.1\.3|8\.3\.2)$/ },
  'node-fetch': { pkg: 'vnode-fetch', versions: /^2\.7\.0$/ },
  uuid: { pkg: 'vuuid', versions: /^9\.0\.1$/ },
  extend: { pkg: 'vextend', versions: /^3\.0\.2$/ },
  'is-stream': { pkg: 'vis-stream', versions: /^2\.0\.1$/ },
  'https-proxy-agent': { pkg: 'vhttps-proxy-agent', versions: /^7\.0\.6$/ },
  'agent-base': { pkg: 'vagent-base', versions: /^(?:7\.1\.4|9\.0\.0)$/ },
  'jwks-rsa': { pkg: 'vjwks-rsa', versions: /^(?:3\.2\.2|4\.1\.0)$/ },
  jsonwebtoken: { pkg: 'vjsonwebtoken', versions: /^9\.0\.3$/ },
  jws: { pkg: 'vjws', versions: /^4\.0\.1$/ },
  jwa: { pkg: 'vjwa', versions: /^2\.0\.1$/ },
  '@google-cloud/functions-framework': { pkg: 'vfunctions-framework', versions: /^5\.0\.2$/ },
  'read-package-up': { pkg: 'vread-package-up', versions: /^11\.0\.0$/, esm: true },
  minimist: { pkg: 'vminimist', versions: /^1\.2\.8$/ },
  cors: { pkg: 'vcors', versions: /^2\.8\.[56]$/ },
  express: { pkg: 'vexpress', versions: /^5\.3\.0$/ },
  router: { pkg: 'vrouter', versions: /^2\.2\.0$/ },
  depd: { pkg: 'vdepd', versions: /^2\.0\.0$/ },
  'path-to-regexp': { pkg: 'vpath-to-regexp', versions: /^8\.4\.2$/ },
  'proxy-addr': { pkg: 'vproxy-addr', versions: /^2\.0\.8$/ },
  'ipaddr.js': { pkg: 'vipaddr', versions: /^1\.9\.1$/ },
  forwarded: { pkg: 'vforwarded', versions: /^0\.2\.0$/ },
  once: { pkg: 'vonce', versions: /^1\.4\.0$/ },
  'merge-descriptors': { pkg: 'vmerge-descriptors', versions: /^2\.0\.0$/ },
  'cookie-signature': { pkg: 'vcookie-signature', versions: /^1\.2\.2$/ },
  vary: { pkg: 'vvary', versions: /^1\.1\.2$/ },
  cookie: { pkg: 'vcookie', versions: /^0\.7\.2$/ },
  'content-disposition': { pkg: 'vcontent-disposition', versions: /^2\.0\.1$/ },
  'body-parser': { pkg: 'vbody-parser', versions: /^2\.4\.0$/ },
  qs: { pkg: 'vqs', versions: /^6\.17\.0$/ },
  'iconv-lite': { pkg: 'viconv-lite', versions: /^0\.7\./ },
  'raw-body': { pkg: 'vraw-body', versions: /^3\.0\./ },
  bytes: { pkg: 'vbytes', versions: /^3\.1\./ },
  negotiator: { pkg: 'vnegotiator', versions: /^1\.1\./ },
  accepts: { pkg: 'vaccepts', versions: /^2\.0\./ },
  'content-type': { pkg: 'vcontent-type', versions: /^2\.1\./ },
  'media-typer': { pkg: 'vmedia-typer', versions: /^1\.1\./ },
  'type-is': { pkg: 'vtype-is', versions: /^2\.1\./ },
  'ee-first': { pkg: 'vee-first', versions: /^1\.1\./ },
  'on-finished': { pkg: 'von-finished', versions: /^2\.4\./ },
  parseurl: { pkg: 'vparseurl', versions: /^1\.3\./ },
  encodeurl: { pkg: 'vencodeurl', versions: /^2\./ },
  'escape-html': { pkg: 'vescape-html', versions: /^1\.0\./ },
  statuses: { pkg: 'vstatuses', versions: /^2\./ },
  ms: { pkg: 'vms', versions: /^2\.1\./ },
  debug: { pkg: 'vdebug', versions: /^4\./ },
  finalhandler: { pkg: 'vfinalhandler', versions: /^2\./ },
  'http-errors': { pkg: 'vhttp-errors', versions: /^2\./ },
  etag: { pkg: 'vetag', versions: /^1\.8\./ },
  fresh: { pkg: 'vfresh', versions: /^2\./ },
  'range-parser': { pkg: 'vrange-parser', versions: /^1\.2\./ },
  'mime-db': { pkg: 'vmime-db', versions: /^1\.54\./ },
  'mime-types': { pkg: 'vmime-types', versions: /^3\./ },
  send: { pkg: 'vsend', versions: /^1\.2\.1$/ },
  'serve-static': { pkg: 'vserve-static', versions: /^2\.2\.1$/ },
};

// Calls and property reads are both counted: consumers read tables such as
// statuses.message and mime.types as often as they call functions.
const calls = Object.fromEntries(Object.keys(targets).map(name => [name, 0]));
function counting(name, value) {
  return new Proxy(value, {
    apply(target, thisArg, args) { calls[name]++; return Reflect.apply(target, thisArg, args); },
    construct(target, args, newTarget) { calls[name]++; return Reflect.construct(target, args, newTarget); },
    get(target, key, receiver) {
      if (typeof key === 'string') calls[name]++;
      const member = Reflect.get(target, key, receiver);
      // Mime stores private instance state; instrumentation must preserve its receiver.
      return name === 'mime' && key !== 'Mime' && typeof member === 'function' ? member.bind(target) : member;
    },
  });
}
// Instrument VPM exports before loading their parents, so transitive calls
// (including range-parser through vsend) are measured, not exempted.
const replacements = {};
const upstreamNames = Object.fromEntries(Object.entries(targets).map(([name, { pkg }]) => [pkg, name]));
function replacement(name) {
  if (Object.hasOwn(replacements, name)) return replacements[name];
  const directory = path.join(__dirname, '../packages', targets[name].pkg);
  for (const pkg of Object.keys(require(path.join(directory, 'package.json')).dependencies || {})) {
    if (Object.hasOwn(upstreamNames, pkg)) replacement(upstreamNames[pkg]);
  }
  const entry = require.resolve(directory);
  const value = counting(name, require(entry));
  require.cache[entry].exports = value;
  replacements[name] = value;
  return value;
}
for (const name of Object.keys(targets)) replacement(name);

// Some packages hide package.json or expose only ESM entry points. Locate their
// metadata through Node's package search paths without executing their code.
function resolveManifest(from, name) {
  try { return from.resolve(name + '/package.json'); } catch (error) {
    if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    for (const directory of from.resolve.paths(name) || []) {
      const manifest = path.join(directory, name, 'package.json');
      if (fs.existsSync(manifest) && require(manifest).name === name) return fs.realpathSync(manifest);
    }
    throw error;
  }
}

// Walk every dependency edge from the fixture roots and alias matching copies.
const aliased = new Map();
const uncovered = new Map();
const contentTypes = new Map();
const contentTypeCallers = new Set();
const seen = new Set();
const queue = [path.join(__dirname, 'protojson-conformance/package.json'), path.join(__dirname, 'protobuf-conformance/package.json'), path.join(__dirname, 'long-conformance/package.json'), path.join(__dirname, 'object-hash-conformance/package.json'), path.join(__dirname, 'storage-conformance/package.json'), ...['@google-cloud/promisify', '@google-cloud/projectify', '@google-cloud/paginator', 'duplexify', 'teeny-request', 'retry-request', 'stream-events'].map(name => path.join(__dirname, 'retry-request-conformance/node_modules', name, 'package.json')), path.resolve(modules, '../package.json'), ...[10, 11].map(version => path.join(__dirname, 'google-http-conformance/node_modules/google-auth' + version + '/package.json'))];
while (queue.length) {
  const manifest = queue.pop();
  if (seen.has(manifest)) continue;
  seen.add(manifest);
  const data = require(manifest);
  if (data.name === 'content-type') contentTypes.set(manifest, data.version);
  const from = createRequire(manifest);
  // Current SDK helpers are fixture roots. Alias scope records tested caller
  // versions, independently of whether a newer VPM replacement has been built.
  if (['@google-cloud/promisify', '@google-cloud/projectify', '@google-cloud/paginator', 'duplexify', 'google-auth-library', 'retry-request', 'stream-events', 'teeny-request'].includes(data.name) && targets[data.name].versions.test(data.version)) {
    const entry = from.resolve(path.dirname(manifest));
    require(entry);
    require.cache[entry].exports = replacements[data.name];
    require.cache[entry].vpmAlias = true;
    aliased.set(data.name + '@' + data.version, path.relative(modules, path.dirname(entry)));
  }
  for (const name of Object.keys(Object.assign({}, data.dependencies, data.optionalDependencies))) {
    let child;
    try { child = resolveManifest(from, name); } catch (error) {
      if (Object.hasOwn(data.optionalDependencies || {}, name) && error.code === 'MODULE_NOT_FOUND') continue;
      throw error;
    }
    queue.push(child);
    if (name === 'content-type') contentTypeCallers.add(data.name);
    if (!Object.hasOwn(targets, name)) continue;
    const version = require(child).version;
    const label = name + '@' + version;
    if (!targets[name].versions.test(version)) {
      const via = uncovered.get(label) || new Set();
      via.add(data.name + '@' + data.version);
      uncovered.set(label, via);
      continue;
    }
    // Keep ESM controls intact, including import-only package exports. The
    // framework and XML fixtures adapt source imports and count VPM calls there.
    if (targets[name].esm) {
      aliased.set(label, path.relative(modules, path.dirname(child)));
      continue;
    }
    const entry = from.resolve(name);
    if (name === 'protobufjs') {
      // All public runtime/extension entries share VPM constructors. The 7.x
      // migration is tested separately with actual SDK source loading.
      const { Module } = require('node:module');
      const upstreamRoot = path.dirname(child);
      const vpmRoot = path.join(__dirname, '../packages/vprotobufjs');
      for (const subpath of ['index.js','light.js','minimal.js','ext/descriptor.js','ext/descriptor/index.js','ext/protojson.js','ext/textformat.js']) {
        const id = require.resolve(path.join(upstreamRoot, subpath));
        const cached = new Module(id);
        cached.filename = id;
        cached.exports = subpath === 'index.js' ? replacements.protobufjs : require(path.join(vpmRoot, subpath));
        cached.loaded = true;
        cached.vpmAlias = true;
        require.cache[id] = cached;
      }
      assert.equal(from('protobufjs/minimal').Reader, replacements.protobufjs.Reader);
      assert(from('protobufjs/ext/descriptor').FileDescriptorSet instanceof replacements.protobufjs.Type);
    }
    if (!require.cache[entry]?.vpmAlias) {
      require(entry);
      require.cache[entry].exports = replacements[name];
      require.cache[entry].vpmAlias = true;
    }
    aliased.set(label, path.relative(modules, path.dirname(entry)));
  }
}
// Upgrade callers instead of overriding a parser across incompatible APIs.
// In particular, old body-parser passes a request object; content-type 2 takes
// a header string. Every current caller must share the supported 2.x copy.
assert.equal(contentTypes.size, 1, 'the consumer graph must share one content-type copy');
assert.match([...contentTypes.values()][0], /^2\./, 'content-type must stay on the compatible 2.x baseline');
for (const name of ['express', 'body-parser', 'type-is', 'negotiator']) {
  assert.ok(contentTypeCallers.has(name), `content-type dependency traversal missed ${name}`);
}
for (const name of Object.keys(targets)) {
  assert.ok([...aliased.keys()].some(label => label.startsWith(name + '@')), `no installed copy of ${name} was aliased`);
}

// Debug output and error logs from the consumers are collected from here on.
const stderr = [];
const writeStderr = process.stderr.write.bind(process.stderr);
const consoleError = console.error;
process.stderr.write = chunk => { stderr.push(String(chunk)); return true; };
console.error = (...args) => { stderr.push(args.map(String).join(' ')); };
let checks = 0;

// Consumers load after aliasing so their require() calls receive VPM exports.
const from = createRequire(path.join(modules, 'package.json'));
const express = from('express');
const getRawBody = from('raw-body');
const createError = from('http-errors');
const jwt = from('jsonwebtoken');
const functions = from('@google-cloud/functions-framework');
const { getTestServer } = require('../packages/vfunctions-framework/testing');
const { parseOptions } = require('../packages/vfunctions-framework/lib/options');
const { onRequest } = from('firebase-functions/v2/https');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-integration-'));
// The VPM framework uses vread-package-up directly. The original ESM reader
// remains available for the raw-reader differential checks below.
const { getUserFunction } = require('../packages/vfunctions-framework/lib/loader');
const readerLoaderFixtures = [];
for (const [id, type] of [['cjs', 'commonjs'], ['esm', 'module'], ['nested', 'commonjs']]) {
  const project = path.join(directory, 'loader-' + id);
  fs.mkdirSync(project);
  if (id === 'nested') fs.writeFileSync(path.join(project, 'package.json'), '{"type":"module"}');
  const location = id === 'nested' ? path.join(project, 'child') : project;
  fs.mkdirSync(location, { recursive: true });
  fs.writeFileSync(path.join(location, 'package.json'), JSON.stringify({type, main:'function.js', custom:'preserve'}));
  fs.writeFileSync(path.join(location, 'function.js'), type === 'module'
    ? `export function vpmLoaded(req, res) { res.end(${JSON.stringify(id)}); }`
    : `exports.vpmLoaded = function(req, res) { res.end(${JSON.stringify(id)}); };`);
  readerLoaderFixtures.push({id, location});
}

const content = '0123456789abcdefghij';
fs.writeFileSync(path.join(directory, 'data.txt'), content);
fs.writeFileSync(path.join(directory, 'page.html'), '<p>page</p>');
fs.writeFileSync(path.join(directory, 'empty.txt'), '');
fs.writeFileSync(path.join(directory, '.secret'), 'hidden');
fs.mkdirSync(path.join(directory, 'nested dir'));
fs.writeFileSync(path.join(directory, 'nested dir', 'index.html'), '<p>index</p>');

// ventimath's functions are onRequest handlers that route on request.path and
// read the JSON body the Functions Framework already parsed.
const api = onRequest({ cors: true }, async (request, response) => {
  if (request.path === '/echo' && request.method === 'POST') return response.json(request.body);
  if (request.path === '/is') return response.json({
    type: request.is(), exact: request.is('APPLICATION/JSON'), suffix: request.is('+JSON'),
    shortcut: request.is(['urlencoded', 'multipart']),
  });
  if (request.path === '/pdf') {
    response.set('Content-Type', 'application/pdf; name=report (1).pdf');
    return response.send(Buffer.from('%PDF-1.4'));
  }
  if (request.path === '/typed') return response.type('json').send('{"ok":true}');
  if (request.path === '/parameterized') return response.set('Content-Type', 'text/plain; note="a;b"; charset=iso-8859-1').send('café');
  if (request.path === '/accept') return response.json({ type: request.accepts(['application/json; profile="a,b"', 'text/html']) });
  if (request.path === '/negotiate') return response.json({
    type: request.accepts('html', 'json'),
    encoding: request.acceptsEncodings('gzip', 'br', 'identity'),
    charset: request.acceptsCharsets('utf-8', 'iso-8859-1'),
    language: request.acceptsLanguages('en', 'fr'),
  });
  if (request.path === '/accept-profile') return response.json({ type: request.accepts(['application/json;profile=ABC', 'text/html']) });
  if (request.path === '/accept-specific') return response.json({ type: request.accepts(['text/html;level=1;profile=a', 'application/json']) });
  if (request.path === '/redirect') return response.redirect('/landing?next=<a b>&x=%zz');
  if (request.path === '/file') return response.sendFile(path.join(directory, 'data.txt'), { maxAge: '1 day' });
  if (request.path === '/deny') throw createError(403, 'forbidden by policy', { headers: { 'X-Policy': 'deny' } });
  if (request.path === '/crash') throw new Error('unexpected failure with secret details');
  response.status(404).json({ error: 'not found' });
});
functions.http('api', api);

// Express applications are also deployed as onRequest handlers.
const app = express();
const cors = from('cors');
const corsRegex = /\.ventimath\.test$/g;
app.use('/vcors-policy', cors({ origin: corsRegex, credentials: true, maxAge: 600 }));
app.get('/vcors-policy', (req, res) => res.json({ cors: 'ok' }));
app.use('/vcors-callback', cors({ origin(origin, callback) {
  callback(null, origin === 'https://allowed.ventimath.test');
  callback(new Error('ignored duplicate CORS callback'));
} }));
app.get('/vcors-callback', (req, res) => res.send('callback policy'));
app.use('/vcors-framing', (req, res, next) => {
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Trailer', 'X-Checksum');
  next();
}, cors({ origin: true, allowedHeaders: ['Authorization'] }));
app.get('/vexpress-bytes', (req, res) => {
  const bytes = Uint8Array.from([9, 1, 2, 3, 8]);
  res.send(new DataView(bytes.buffer, 1, 3));
});
app.get('/vexpress-send-framing', (req, res) => res.set({ 'Transfer-Encoding': 'chunked', 'Content-Length': '999' }).send('framed'));
app.get('/vexpress-redirect-framing', (req, res) => res.set({ 'Transfer-Encoding': 'chunked', Trailer: 'X-Checksum' }).redirect('/next'));
for (const status of [204, 205, 304]) app.get('/vexpress-empty-' + status, (req, res) => res.set({ 'Transfer-Encoding': 'chunked', Trailer: 'X-Checksum' }).status(status).send('discard'));
app.get('/vexpress-own-headers', (req, res) => res.set(Object.assign(Object.create({ 'X-Inherited': 'bad' }), { 'X-Own': 'yes' })).send('own'));
// Exercise deprecation warnings through actual Express and router callers.
const deprecations = [];
const recordDeprecation = error => deprecations.push(error);
process.on('deprecation', recordDeprecation);
const deprecatedApp = express.Router();
deprecatedApp.get('/redirect', (_req, res) => res.redirect(123));
deprecatedApp.get('/missing-url', (_req, res) => res.redirect());
deprecatedApp.get('/status', (_req, res) => res.redirect('302', '/landing'));
deprecatedApp.get('/handler', () => ({ then(_resolve, reject) { reject(new Error('thenable handler')); } }));
deprecatedApp.param('value', () => ({ then(_resolve, reject) { reject(new Error('thenable parameter')); } }));
deprecatedApp.get('/parameter/:value', (_req, res) => res.send('unexpected'));
deprecatedApp.get('/error-handler', (_req, _res, next) => next(new Error('first')));
deprecatedApp.use('/error-handler', (_error, _req, _res, _next) => ({ then(_resolve, reject) { reject(new Error('thenable error handler')); } }));
deprecatedApp.use((error, _req, res, _next) => res.status(500).send(error.message));
app.use('/deprecation-check', deprecatedApp);
// Match real Express 5 routes through router's path-to-regexp interface.
const routeApp = express();
routeApp.get('/users/:id', (req, res) => res.json({ params: req.params }));
routeApp.get('/files/*parts', (req, res) => res.json({ params: req.params }));
routeApp.get('/optional{/:id}{.:ext}', (req, res) => res.json({ params: req.params }));
routeApp.get(['/first/:id', '/second/:id'], (req, res) => res.json({ params: req.params }));
routeApp.get('/:"__proto__"/prototype', (req, res) => res.json({ params: req.params }));
routeApp.use('/mount/:id', (req, res) => res.json({ params: req.params, baseUrl: req.baseUrl, url: req.url }));
routeApp.param('constructor', (req, _res, next, value) => { req.params.constructor = value.toUpperCase(); next(); });
routeApp.get('/callback/:constructor', (req, res) => res.json(req.params));
const statefulRoute = /^\/stateful\/([^/]+)$/g;
statefulRoute.lastIndex = 12;
routeApp.get(statefulRoute, (req, res) => res.json(req.params));
routeApp.get(/^\/literal\/\((?<letter>a)[)]$/, (req, res) => res.json(req.params));
routeApp.get('/single-then', () => {
  let reads = 0;
  return { get then() {
    if (++reads > 1) throw new Error('then read twice');
    return (_resolve, reject) => reject(Object.assign(new Error('once'), { status: 409 }));
  } };
});
routeApp.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.name }));
const mergedRouter = express.Router({ mergeParams: true });
mergedRouter.get('/:id', (req, res) => res.json(req.params));
app.use('/merged-router/:team', mergedRouter);
const strictRoutes = express.Router({ strict: true, caseSensitive: true });
strictRoutes.get('/Case/:id', (req, res) => res.json({ params: req.params }));
app.use('/route-check', routeApp);
app.use('/strict-route', strictRoutes);
// Exercise forwarded through its real proxy-addr caller and Express getters.
for (const [name, trust] of [
  ['none', false], ['all', true], ['one', 1], ['subnets', ['loopback', '10.0.0.0/8']],
  ['mapped', ['loopback', '::ffff:10.0.0.0/104']],
  ['ipv6', ['loopback', '2001:db8::/32']],
  ['compatible', ['loopback', '::192.0.2.0/120']],
  ['native', ['loopback', '2000::/3']],
  ['zero4', ['loopback', '0.0.0.0/0']],
  ['zero6', ['loopback', '::/0']],
  ['shortmapped', ['loopback', '::ffff:10.0.0.0/8']],
  ['netmask', ['loopback', '10.0.0.0/255.0.0.0']],
  ['scoped', ['loopback', 'fe80::%en-0/10']],
]) {
  const child = express();
  child.set('trust proxy', trust);
  child.get('/', (req, res) => res.json({ ip: req.ip, ips: req.ips, socket: req.socket.remoteAddress }));
  app.use('/proxy-' + name, child);
}
const httpCookie = from('cookie');
const cookieSignature = from('cookie-signature');
app.get('/signed-cookie-check', (req, res) => {
  const value = httpCookie.parse(req.headers.cookie || '').sid || '';
  res.json({ value: cookieSignature.unsign(value, 'integration-only-cookie-secret') });
});
app.get('/vary-fields', (_req, res) => res.set('Vary', ['Accept-Encoding', 'Origin']).vary('accept-encoding,\tCookie').vary(['ORIGIN', 'X-Variant']).send('varied'));
app.get('/vary-wildcard', (_req, res) => res.set('Vary', 'Accept, \t*').vary('Origin').send('varied'));
app.get('/vary-invalid', (_req, res) => res.vary(['Origin', 'Bad Header']).send('invalid'));

app.get('/cookies', (req, res) => {
  req.secret = 'integration-only-cookie-secret';
  res.cookie('plain', 'value').cookie('unicode', '雪')
    .cookie('object', { ok: true }).cookie('signed', 'value', { signed: true })
    .cookie('attrs', 'value', { domain: '.example.com', path: '/cookies', expires: new Date(0), httpOnly: true, secure: true, partitioned: true, priority: 'high', sameSite: 'lax' })
    .cookie('custom', 'a/b', { encode: value => value })
    .cookie('max-age', 'value', { maxAge: 1500 })
    .clearCookie('gone')
    .json(httpCookie.parse(req.headers.cookie || ''));
});
app.get('/cookie-invalid', (_req, res) => res.cookie('secret', 'private', { encode: () => 'x; injected=1' }).end());
const completed = []; const failures = [];
function sent(name, next) {
  return error => { if (error) { failures.push(error); next(error); } else completed.push(name); };
}
app.get('/send-file', (_req, res, next) => res.sendFile('data.txt', { root: directory, headers: { 'X-Custom': 'yes' } }, sent('file', next)));
app.get('/send-empty', (_req, res, next) => res.sendFile(path.join(directory, 'empty.txt'), sent('empty', next)));
app.get('/download', (_req, res, next) => res.download(path.join(directory, 'data.txt'), 'renamed.txt', sent('download', next)));
const downloadNames = [
  ['unicode', 'café-雪.txt', 'attachment; filename="caf?-?.txt"; filename*=UTF-8\'\'caf%C3%A9-%E9%9B%AA.txt'],
  ['quotes', 'a"b.txt', 'attachment; filename="a\\"b.txt"'],
  ['percent', '%20.txt', 'attachment; filename=%20.txt; filename*=UTF-8\'\'%2520.txt'],
  ['control', 'a\r\nb.txt', 'attachment; filename="a??b.txt"; filename*=UTF-8\'\'a%0D%0Ab.txt'],
];
for (const [id, filename] of downloadNames) {
  app.get('/download-' + id, (_req, res, next) => res.download(path.join(directory, 'data.txt'), filename, sent('download-' + id, next)));
  app.get('/attachment-' + id, (_req, res) => res.attachment(filename).send(content));
}
app.get('/send-missing', (_req, res, next) => res.sendFile('missing.txt', { root: directory }, sent('missing', next)));
app.use('/static', express.static(directory, { maxAge: '2 hours', extensions: ['html'], setHeaders: res => res.setHeader('X-Static', 'yes') }));
app.use('/strict', express.static(directory, { fallthrough: false, redirect: false }));
app.use('/hidden', express.static(directory, { fallthrough: false, dotfiles: 'deny' }));
app.use('/mounted', express.static(directory, { index: 'page.html' }));
app.use('/static-framing', (_req, res, next) => {
  res.setHeader('Transfer-Encoding', 'chunked'); res.setHeader('Trailer', 'Digest');
  res.setHeader('Content-Encoding', 'gzip'); res.setHeader('Content-Range', 'bytes 0-1/2'); next();
}, express.static(directory, { fallthrough: false }));
app.post('/body', express.json({ limit: '64b' }), (req, res) => res.json(req.body));
app.get('/cached', (_req, res) => res.send('stable body'));
app.get('/format', (_req, res) => res.format({
  html: () => res.send('<p>html</p>'),
  json: () => res.json({ format: 'json' }),
}));
app.get('/error', (_req, _res, next) => next(createError(401, 'private', { headers: { 'WWW-Authenticate': 'Basic' } })));
app.get('/double', (_req, _res, next) => { next(); setImmediate(() => next(new Error('late error'))); });
app.get('/framing', (_req, res, next) => { res.setHeader('Transfer-Encoding', 'chunked'); next(createError(429, 'slow down', { headers: { 'Retry-After': '5' } })); });
functions.http('app', onRequest(app));

// A direct Express app also tests custom parser patterns before the framework's
// catch-all raw parser can consume their bodies.
const parserApp = express();
parserApp.use('/route-check', routeApp);
parserApp.set('query parser', 'extended');
parserApp.get('/nested-query', (req, res) => res.json(req.query));
parserApp.post('/nested-form', express.urlencoded({ extended: true, depth: 3, parameterLimit: 8, charsetSentinel: true, interpretNumericEntities: true }), (req, res) => res.json(req.body));
parserApp.post('/large-form-limit', express.urlencoded({ extended: true, parameterLimit: 2 ** 32 }), (req, res) => res.json(req.body));
const frozenVerificationError = Object.freeze(Object.assign(new Error('rejected'), { status: 422 }));
parserApp.post('/frozen-verify', express.json({ verify() { throw frozenVerificationError; } }), (_req, _res) => assert.fail('verification should fail'),
  (error, _req, res, _next) => {
    assert.equal(error.cause, frozenVerificationError);
    assert.equal(error.type, 'entity.verify.failed');
    res.status(error.status).json({ type: error.type });
  });
parserApp.post('/primitive-reviver', express.json({ reviver() { throw null; } }), (_req, _res) => assert.fail('reviver should fail'),
  (error, _req, res, _next) => {
    assert.equal(error.cause, null);
    assert.equal(error.type, 'entity.parse.failed');
    res.status(error.status).json({ type: error.type });
  });
// Exercise byte limits before the framework's parser has consumed the stream.
for (const limit of ['100kbjunk', '1e3', '', '8pb']) {
  const expected = { name: limit === '8pb' ? 'RangeError' : 'TypeError' };
  assert.throws(() => express.json({ limit }), expected);
  const stream = new PassThrough();
  // raw-body normally interprets a null parse result as unlimited. Invalid
  // supplied limits must throw before reading, including its callback API.
  assert.throws(() => getRawBody(stream, { limit }, () => assert.fail('invalid limit invoked callback')), expected);
  assert.throws(() => getRawBody(stream, { limit }), expected);
  assert.equal(stream.readableFlowing, null);
  assert.equal(stream.listenerCount('data'), 0);
  stream.destroy();
}
// As in body-parser and raw-body, an Infinity limit means no limit.
assert.doesNotThrow(() => express.json({ limit: Infinity }));
parserApp.post('/limit-json', express.json({ limit: '7b' }), (req, res) => res.json(req.body));
parserApp.post('/limit-raw', express.raw({ limit: '1kb' }), (req, res) => res.json({ length: req.body.length }));
parserApp.post('/limit-text', express.text({ limit: '3b' }), (req, res) => res.json({ text: req.body }));
parserApp.post('/verified-json', express.json({ verify(_req, _res, buffer, encoding) {
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(encoding, 'utf-8');
  if (buffer.toString() !== '{"a":1}') throw new Error('verification failed');
} }), (req, res) => res.json(req.body));
parserApp.post('/direct-raw', async (req, res, next) => {
  try { const body = await getRawBody(req, { limit: '4b' }); res.json({ length: body.length }); } catch (error) { next(error); }
});
parserApp.post('/encoded-raw', async (req, res, next) => {
  let chunks = 0;
  req.on('data', () => { chunks++; });
  try { const text = await getRawBody(req, { encoding: req.query.charset, limit: '16kb' }); res.json({ text, chunks }); }
  catch (error) { next(error); }
});
parserApp.post('/unlimited-raw', async (req, res, next) => {
  try { const body = await getRawBody(req); res.json({ length: body.length }); } catch (error) { next(error); }
});
parserApp.post('/invalid-limit', (req, res) => {
  try { getRawBody(req, { limit: '100kbjunk' }, () => res.sendStatus(200)); }
  catch (error) { assert.ok(error instanceof TypeError); req.resume(); res.sendStatus(400); }
});
parserApp.use(express.json({ type: ['APPLICATION/JSON', 'application/*+JSON'] }));
parserApp.use(express.text({ type: 'TEXT/*' }));
parserApp.use(express.urlencoded({ extended: false, type: 'URLENCODED' }));
parserApp.use((req, res) => res.json({ body: req.body === undefined ? null : req.body }));

async function listen(server) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return server;
}

// Exercise Express's actual descriptor mixin and listen callback, including
// metadata that upstream once incorrectly treats as its internal call state.
async function expressStartup() {
  const { EventEmitter } = require('node:events');
  const emitterPrototype = EventEmitter.prototype;
  const symbol = Symbol('application getter');
  let getterCalls = 0;
  let descriptorReads = 0;
  const getter = function () { getterCalls++; return this; };
  let application;
  Object.defineProperty(express.application, symbol, { get: getter, configurable: true });
  try {
    // Ordinary application construction specializes descriptor copies. A proxy
    // source still exercises the general vmerge-descriptors dependency in the
    // real consumer, including the subsequent listen success/error paths.
    EventEmitter.prototype = new Proxy(emitterPrototype, {
      getOwnPropertyDescriptor(target, key) {
        descriptorReads++;
        return Reflect.getOwnPropertyDescriptor(target, key);
      }
    });
    application = express();
  } finally {
    EventEmitter.prototype = emitterPrototype;
    delete express.application[symbol];
  }
  assert.ok(descriptorReads > 0, 'proxy descriptors must be inspected');
  assert.equal(getterCalls, 0, 'mixing application descriptors must not invoke accessors');
  assert.equal(Object.getOwnPropertyDescriptor(application, symbol).get, getter);
  assert.equal(application[symbol], application);
  assert.equal(getterCalls, 1);
  application.get('/startup', (_req, res) => res.send('started'));
  const servers = [];
  async function start(app, port) {
    let server, timer, calls = 0;
    try {
      const settled = new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Express listen callback did not settle')), 5000);
        const callback = Object.assign(function (error) {
          calls++;
          resolve({ error, receiver: this });
        }, { called: true, value: 'untrusted callback metadata' });
        server = app.listen(port, '127.0.0.1', callback);
        servers.push(server);
      });
      const result = await settled;
      assert.equal(result.receiver, server);
      assert.equal(calls, 1);
      return { ...result, server, calls: () => calls };
    } finally { clearTimeout(timer); }
  }
  try {
    const started = await start(application, 0);
    assert.ok(started.error == null, 'successful listen has no error (undefined on Node, null on Bun)');
    const response = await request(started.server, '/startup');
    assert.equal(response.status, 200); assert.equal(response.body, 'started');
    // Express wires the same once wrapper to listening and the first error.
    started.server.emit('error', new Error('late startup error'));
    assert.equal(started.calls(), 1);
    const failed = await start(express(), started.server.address().port);
    assert.equal(failed.error.code, 'EADDRINUSE');
    assert.equal(failed.calls(), 1);
  } finally {
    for (const server of servers) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
}

async function abortedRequest() {
  checks++;
  let client, resolveRead, rejectRead;
  const completed = new Promise((resolve, reject) => { resolveRead = resolve; rejectRead = reject; });
  const server = await listen(http.createServer(req => {
    req.once('data', () => client.destroy());
    getRawBody(req, { length: 8 }, error => {
      try {
        assert.equal(error.type, 'request.aborted');
        assert.equal(error.status, 400); assert.equal(error.code, 'ECONNABORTED');
        assert.equal(error.received, 2); assert.equal(error.expected, 8);
        assert.equal(req.listenerCount('data'), 0);
        resolveRead();
      } catch (error) { rejectRead(error); }
    });
  }));
  const timer = setTimeout(() => rejectRead(new Error('aborted body read did not settle')), 5000);
  try {
    client = http.request({ host: '127.0.0.1', port: server.address().port, method: 'POST', headers: { 'content-length': '8' }, agent: false });
    client.on('error', error => { if (error.code !== 'ECONNRESET') rejectRead(error); });
    client.write('ab');
    await completed;
  } finally {
    clearTimeout(timer); client?.destroy();
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
}

function request(server, route, { headers = {}, method = 'GET', body, chunks } = {}) {
  checks++;
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: route, headers, method, agent: false }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('integration request timed out')));
    if (chunks) {
      const send = index => {
        if (index === chunks.length) { req.end(); return; }
        req.write(chunks[index]); setTimeout(() => send(index + 1), 10);
      };
      send(0);
    } else req.end(body);
  });
}

async function run() {
  const readerParityChecks = await require('../packages/vread-package-up/test/comparison.cjs').compare(directory, modules);
  const loadedServers = [];
  try {
    for (const {id, location} of readerLoaderFixtures) {
      const loaded = await getUserFunction(location, 'vpmLoaded', 'http');
      assert.ok(loaded, id + ' module must load through the framework');
      assert.equal(loaded.signatureType, 'http');
      functions.http('manifest-' + id, loaded.userFunction);
      const server = await listen(getTestServer('manifest-' + id));
      loadedServers.push(server);
      assert.equal((await request(server, '/')).body, id);
    }
  } finally {
    for (const server of loadedServers) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
  const apiServer = await listen(getTestServer('api'));
  const appServer = await listen(getTestServer('app'));
  const parserServer = await listen(http.createServer(parserApp));
  try {
    // Exercise the actual framework option parser after replacing minimist.
    let parsed = parseOptions([], {});
    assert.equal(parsed.port, '8080'); assert.equal(parsed.target, 'function');
    parsed = parseOptions(['node', 'server.js', '--port=08080', '--target', 'api', '--source', 'functions', '--signature-type=http', '--timeout=5', '--log-execution-id'], { PORT: '9000' });
    assert.equal(parsed.port, '08080'); assert.equal(parsed.target, 'api');
    assert.equal(parsed.sourceLocation, path.resolve('functions')); assert.equal(parsed.timeoutMilliseconds, 5000); assert.equal(parsed.enableExecutionId, true);
    parsed = parseOptions([], { PORT: '9000', FUNCTION_TARGET: 'envTarget', FUNCTION_SIGNATURE_TYPE: 'cloudevent', LOG_EXECUTION_ID: 'true' });
    assert.equal(parsed.port, '9000'); assert.equal(parsed.target, 'envTarget'); assert.equal(parsed.signatureType, 'cloudevent'); assert.equal(parsed.enableExecutionId, true);
    parsed = parseOptions(['--', '--port=9999', '--target=ignored'], {});
    assert.equal(parsed.port, '8080'); assert.equal(parsed.target, 'function');
    parsed = parseOptions(['--toString=ignored', '--constructor.prototype.polluted=true', '--port', '8081'], {});
    assert.equal(parsed.port, '8081'); assert.equal(Object.prototype.polluted, undefined);
    assert.throws(() => parseOptions(['--signature-type=invalid'], {}), /signature type/);
    assert.equal((await request(appServer, '/vexpress-bytes')).body, '\x01\x02\x03');
    const generatedSend = await request(appServer, '/vexpress-send-framing');
    assert.equal(generatedSend.body, 'framed'); assert.equal(generatedSend.headers['content-length'], undefined);
    const generatedRedirect = await request(appServer, '/vexpress-redirect-framing');
    assert.equal(generatedRedirect.status, 302); assert.equal(generatedRedirect.headers['transfer-encoding'], undefined); assert.equal(generatedRedirect.headers.trailer, undefined);
    for (const status of [204, 205, 304]) {
      const generated = await request(appServer, '/vexpress-empty-' + status);
      assert.equal(generated.status, status); assert.equal(generated.body, ''); assert.equal(generated.headers.trailer, undefined);
    }
    const ownHeaders = await request(appServer, '/vexpress-own-headers');
    assert.equal(ownHeaders.headers['x-own'], 'yes'); assert.equal(ownHeaders.headers['x-inherited'], undefined);
    await expressStartup();
    await abortedRequest();
    const redirected = await request(appServer, '/deprecation-check/redirect');
    assert.equal(redirected.status, 302); assert.equal(redirected.headers.location, '123');
    const warningCount = deprecations.length;
    assert.ok(warningCount > 0);
    assert.equal((await request(appServer, '/deprecation-check/redirect')).status, 302);
    assert.equal(deprecations.length, warningCount, 'repeat request should not repeat a call-site warning');
    assert.equal((await request(appServer, '/deprecation-check/missing-url')).status, 302);
    assert.equal((await request(appServer, '/deprecation-check/status')).status, 500);
    for (const [route, body] of [['handler', 'thenable handler'], ['parameter/a', 'thenable parameter'], ['error-handler', 'thenable error handler']]) {
      const response = await request(appServer, '/deprecation-check/' + route);
      assert.equal(response.status, 500); assert.equal(response.body, body);
    }
    for (const [namespace, message] of [
      ['express', 'Url must be a string'], ['express', 'Provide a url argument'], ['express', 'Status must be a number'],
      ['router', 'handlers that are Promise-like are deprecated, use a native Promise instead'],
      ['router', 'parameters that are Promise-like are deprecated, use a native Promise instead'],
    ]) assert.ok(deprecations.some(error => error instanceof Error && error.name === 'DeprecationError' && error.namespace === namespace && error.message === message), message);
    for (const [path, expected] of [
      ['/users/alice', { id: 'alice' }], ['/USERS/alice/', { id: 'alice' }],
      ['/users/caf%C3%A9', { id: 'café' }], ['/users/a%2Fb', { id: 'a/b' }],
      ['/files/a/b/c', { parts: ['a', 'b', 'c'] }], ['/files/a%2Fb/c', { parts: ['a/b', 'c'] }],
      ['/optional', {}], ['/optional/42.json', { id: '42', ext: 'json' }],
      ['/second/42', { id: '42' }], ['/safe/prototype', { ['__proto__']: 'safe' }],
    ]) {
      const result = await request(appServer, '/route-check' + path);
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), { params: expected });
    }
    for (const path of ['/route-check/users/%', '/route-check/files/a/%E0%A4']) {
      // Framework's wildcard decodes first; also exercise our child error handler directly.
      assert.equal((await request(appServer, path)).status, 400);
      const result = await request(parserServer, path);
      assert.equal(result.status, 400); assert.deepEqual(JSON.parse(result.body), { error: 'URIError' });
    }
    for (let i = 0; i < 3; i++) {
      const result = await request(appServer, '/route-check/stateful/value');
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), { 0: 'value' });
    }
    assert.equal(statefulRoute.lastIndex, 12);
    for (const [url, expected] of [
      ['/route-check/callback/value', { constructor: 'VALUE' }],
      ['/route-check/literal/(a)', { letter: 'a' }],
      ['/merged-router/red/42', { team: 'red', id: '42' }],
    ]) {
      const result = await request(appServer, url);
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), expected);
    }
    assert.equal((await request(appServer, '/route-check/single-then')).status, 409);
    const automaticOptions = await request(appServer, '/route-check/users/42', { method: 'OPTIONS' });
    assert.equal(automaticOptions.status, 200); assert.equal(automaticOptions.headers.allow, 'GET, HEAD');
    const automaticHead = await request(appServer, '/route-check/users/42', { method: 'HEAD' });
    assert.equal(automaticHead.status, 200); assert.equal(automaticHead.body, '');
    // Proxy-style absolute request targets still parse and mount correctly.
    // The HTTP connection remains local; only the request-target contains a host.
    for (const url of ['http://example.test/route-check/users/42?q=1', 'https://[::1]:8443/route-check/users/a%20b?q=1']) {
      const result = await request(appServer, url);
      assert.equal(result.status, 200);
      assert.deepEqual(JSON.parse(result.body), { params: { id: url.includes('a%20b') ? 'a b' : '42' } });
    }
    const mounted = await request(appServer, '/route-check/mount/42/child?x=1');
    assert.equal(mounted.status, 200);
    assert.deepEqual(JSON.parse(mounted.body), { params: { id: '42' }, baseUrl: '/route-check/mount/42', url: '/child?x=1' });
    for (const [path, status] of [['/strict-route/Case/42', 200], ['/strict-route/case/42', 404], ['/strict-route/Case/42/', 404], ['/route-check/users', 404], ['/route-check/mountish/42', 404]]) {
      assert.equal((await request(appServer, path)).status, status);
    }
    for (const [mode, header, expected] of [
      ['zero4', '198.51.100.7, 203.0.113.1', ['198.51.100.7', '203.0.113.1']],
      ['zero4', '198.51.100.7, ::ffff:203.0.113.1', ['198.51.100.7', '::ffff:203.0.113.1']],
      ['zero4', '198.51.100.7, 2001:db8::1', ['2001:db8::1']],
      ['zero6', '198.51.100.7, 2001:db8::1', ['198.51.100.7', '2001:db8::1']],
      ['zero6', '198.51.100.7, ::ffff:203.0.113.1', ['::ffff:203.0.113.1']],
      ['shortmapped', '198.51.100.7, ::ffff:10.0.0.1', ['::ffff:10.0.0.1']],
      ['shortmapped', '198.51.100.7, ::abcd', ['::abcd']],
      ['netmask', '198.51.100.7, 10.1.2.3', ['198.51.100.7', '10.1.2.3']],
      ['scoped', '198.51.100.7, fe80::1%other-0', ['198.51.100.7', 'fe80::1%other-0']],
      ['subnets', 'spoofed, 192.0.2.1, 10.0.0.1', ['192.0.2.1', '10.0.0.1']],
      ['mapped', '198.51.100.7, 10.0.0.1', ['198.51.100.7', '10.0.0.1']],
      ['mapped', '198.51.100.7, ::ffff:10.0.0.1', ['198.51.100.7', '::ffff:10.0.0.1']],
      ['mapped', '198.51.100.7, ::a00:1', ['::a00:1']],
      ['ipv6', '198.51.100.7, 2001:db8::1', ['198.51.100.7', '2001:db8::1']],
      ['ipv6', '198.51.100.7, 2001:db9::1', ['2001:db9::1']],
      ['compatible', '198.51.100.7, ::192.0.2.1', ['198.51.100.7', '::192.0.2.1']],
      ['compatible', '198.51.100.7, ::ffff:192.0.2.1', ['::ffff:192.0.2.1']],
      ['native', '198.51.100.7, 10.0.0.1', ['10.0.0.1']],
      ['subnets', '198.51.100.7, 10.0.0.1junk', ['10.0.0.1junk']],
      ['all', undefined, []],
      ['none', '198.51.100.7, 10.0.0.1', []],
      ['all', '198.51.100.7, 10.0.0.1', ['198.51.100.7', '10.0.0.1']],
      ['one', '198.51.100.7, 10.0.0.1', ['10.0.0.1']],
      ['subnets', '198.51.100.7,\t10.0.0.1\t', ['198.51.100.7', '10.0.0.1']],
      ['subnets', '2001:db8::7,\t::ffff:10.0.0.1', ['2001:db8::7', '::ffff:10.0.0.1']],
      ['subnets', '198.51.100.7, 203.0.113.9, 10.0.0.1', ['203.0.113.9', '10.0.0.1']],
      ['all', '198.51.100.7,, \t , 10.0.0.1', ['198.51.100.7', '10.0.0.1']],
      ['all', 'unknown, 10.0.0.1', ['unknown', '10.0.0.1']],
      ['all', ['198.51.100.7', '10.0.0.1'], ['198.51.100.7', '10.0.0.1']],
      ['all', ', \t , ', []],
    ]) {
      const result = await request(appServer, '/proxy-' + mode, { headers: header === undefined ? {} : { 'x-forwarded-for': header } });
      assert.equal(result.status, 200);
      const body = JSON.parse(result.body);
      assert.deepEqual(body.ips, expected);
      assert.equal(body.ip, expected[0] || body.socket);
    }
    const largeLimit = await request(parserServer, '/large-form-limit', { method: 'POST', body: 'a=1&b=2', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    assert.equal(largeLimit.status, 200); assert.deepEqual(JSON.parse(largeLimit.body), { a: '1', b: '2' });
    for (const [route, status, type] of [['/frozen-verify', 422, 'entity.verify.failed'], ['/primitive-reviver', 400, 'entity.parse.failed']]) {
      const result = await request(parserServer, route, { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json' } });
      assert.equal(result.status, status); assert.deepEqual(JSON.parse(result.body), { type });
    }
    for (const [query, expected] of [
      ['person[name]=Ada&tags[]=math&tags[]=code', { person: { name: 'Ada' }, tags: ['math', 'code'] }],
      ['a=1&a=2&bad=%E0%A4%A&text=hello+world', { a: ['1', '2'], bad: '%E0%A4%A', text: 'hello world' }],
      ['__proto__[vqsPolluted]=yes&safe=ok', { safe: 'ok' }],
    ]) {
      const result = await request(parserServer, '/nested-query?' + query);
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), expected);
      assert.equal(Object.prototype.vqsPolluted, undefined);
    }
    for (const [body, expected] of [
      ['person[name]=Ada&tags[]=math&tags[]=code', { person: { name: 'Ada' }, tags: ['math', 'code'] }],
      ['a[2]=x&a[0]=y', { a: ['y', 'x'] }],
      ['a[b]=x&a=y&a=z', { a: { b: 'x', 0: 'y', 1: 'z' } }],
      ['a=1&a=2&empty=&bare', { a: ['1', '2'], empty: '', bare: '' }],
      ['a=%F0%9F%92%A9&bad=%E0%A4%A', { a: '💩', bad: '%E0%A4%A' }],
      ['utf8=%26%2310003%3B&a=%E9&b=%26%2310003%3B', { a: 'é', b: '✓' }],
      ['__proto__[vqsPolluted]=yes&safe=ok', { safe: 'ok' }],
    ]) {
      const result = await request(parserServer, '/nested-form', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), expected);
      assert.equal(Object.prototype.vqsPolluted, undefined);
    }
    for (const [body, status] of [['a[b][c][d][e]=x', 400], [Array(9).fill('a=1').join('&'), 413]]) {
      const result = await request(parserServer, '/nested-form', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
      assert.equal(result.status, status);
    }
    const defaults = { type: 'html', encoding: 'identity', charset: 'utf-8', language: 'en' };
    for (const [headers, changes] of [
      [{}, {}],
      // Quality values are read as negotiator reads them, and an empty Accept
      // field is treated as absent, as accepts treats it.
      [{ accept: 'text/html;q=2, application/json;q=0.7' }, {}],
      [{ accept: 'text/html;q=0.8junk, application/json;q=0.5' }, {}],
      [{ accept: '' }, {}],
      [{ accept: '*/*;q=0' }, { type: false }],
      [{ accept: 'text/html;q=0, */*;q=1' }, { type: 'json' }],
      [{ accept: 'text/html, application/json, text/html' }, {}],
      [{ accept: ['text/html;q=0.2', 'application/json'] }, { type: 'json' }],
      [{ 'accept-encoding': 'gzip;q=0.5, br;q=0.9' }, { encoding: 'br' }],
      [{ 'accept-encoding': '*;q=0' }, { encoding: false }],
      [{ 'accept-charset': 'utf-8;Q=2, iso-8859-1;q=0.5' }, {}],
      [{ 'accept-language': 'en;q=0.8junk, fr;q=0.5' }, {}],
      [{ 'accept-language': 'en;q=0.5, fr;q=0.9' }, { language: 'fr' }],
    ]) {
      const result = await request(apiServer, '/negotiate', { headers });
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), { ...defaults, ...changes });
    }
    const profile = await request(apiServer, '/accept-profile', { headers: { accept: 'application/json;profile=abc, text/html;q=0.5' } });
    assert.equal(profile.status, 200); assert.deepEqual(JSON.parse(profile.body), { type: 'text/html' });
    const specific = await request(apiServer, '/accept-specific', { headers: { accept: 'text/html;level=1;q=0.9, text/html;level=1;profile=a;q=0, application/json;q=0.5' } });
    assert.equal(specific.status, 200); assert.deepEqual(JSON.parse(specific.body), { type: 'application/json' });
    const formatted = await request(appServer, '/format', { headers: { accept: 'text/html;q=0.4, application/json;q=0.5' } });
    assert.equal(formatted.status, 200); assert.equal(formatted.body, '{"format":"json"}');
    assert.equal(formatted.headers['content-type'], 'application/json; charset=utf-8');
    assert.match(formatted.headers.vary, /Accept/);
    assert.equal((await request(appServer, '/format', { headers: { accept: 'text/html' } })).body, '<p>html</p>');
    assert.equal((await request(appServer, '/format', { headers: { accept: '*/*;q=0' } })).status, 406);
    // Express req.is preserves null / false / matching-string results.
    for (const [options, expected] of [
      [{}, { type: null, exact: null, suffix: null, shortcut: null }],
      [{ method: 'POST', body: 'x' }, { type: false, exact: false, suffix: false, shortcut: false }],
      [{ method: 'POST', headers: { 'content-type': 'APPLICATION/JSON' }, body: '{}' },
        { type: 'application/json', exact: 'APPLICATION/JSON', suffix: false, shortcut: false }],
      [{ method: 'POST', headers: { 'content-type': 'application/problem+json' }, body: '{}' },
        { type: 'application/problem+json', exact: false, suffix: 'application/problem+json', shortcut: false }],
      [{ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=1' },
        { type: 'application/x-www-form-urlencoded', exact: false, suffix: false, shortcut: 'urlencoded' }],
      [{ method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=x' }, body: 'x' },
        { type: 'multipart/form-data', exact: false, suffix: false, shortcut: 'multipart' }],
      [{ method: 'POST', headers: { 'content-type': 'text/@bad' }, body: 'x' },
        { type: false, exact: false, suffix: false, shortcut: false }],
    ]) {
      const result = await request(apiServer, '/is', options);
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), expected);
    }
    for (const [type, body, parsed] of [
      ['application/json', '{"a":1}', { a: 1 }],
      ['APPLICATION/PROBLEM+JSON; charset=utf-8', '{"a":2}', { a: 2 }],
      ['application/vnd.foo+bar+json', '{"a":3}', { a: 3 }],
      ['text/plain', 'hello', 'hello'],
      ['application/x-www-form-urlencoded', 'a=1&b=two', { a: '1', b: 'two' }],
      ['application/octet-stream', 'ignored', null],
      ['text/@bad', 'ignored', null],
    ]) {
      const result = await request(parserServer, '/', { method: 'POST', headers: { 'content-type': type }, body });
      assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), { body: parsed });
    }
    for (const [route, type, body, extra, expected] of [
      ['/limit-json', 'application/json', '{"a":1}', {}, 200],
      ['/limit-json', 'application/json', '{"a":10}', {}, 413],
      ['/limit-raw', 'application/octet-stream', 'x'.repeat(1024), { 'content-length': '1024' }, 200],
      ['/limit-raw', 'application/octet-stream', 'x'.repeat(1025), { 'content-length': '1025' }, 413],
      ['/direct-raw', 'application/octet-stream', '1234', { 'transfer-encoding': 'chunked' }, 200],
      ['/direct-raw', 'application/octet-stream', '12345', { 'transfer-encoding': 'chunked' }, 413],
      ['/limit-text', 'text/plain', 'éa', {}, 200],
      ['/limit-text', 'text/plain', 'éé', {}, 413],
      ['/limit-raw', 'application/octet-stream', gzipSync('x'.repeat(1024)), { 'content-encoding': 'gzip' }, 200],
      ['/limit-raw', 'application/octet-stream', gzipSync('x'.repeat(1025)), { 'content-encoding': 'gzip' }, 413],
      ['/unlimited-raw', 'application/octet-stream', '12345', {}, 200],
      ['/invalid-limit', 'application/octet-stream', 'x'.repeat(200), {}, 400],
    ]) {
      const result = await request(parserServer, route, { method: 'POST', headers: { 'content-type': type, ...extra }, body });
      assert.equal(result.status, expected, route + ' ' + body.length);
      if (route === '/limit-raw' && expected === 200) assert.deepEqual(JSON.parse(result.body), { length: 1024 });
      if (route === '/direct-raw' && expected === 200) assert.deepEqual(JSON.parse(result.body), { length: 4 });
      if (route === '/limit-json' && expected === 200) assert.deepEqual(JSON.parse(result.body), { a: 1 });
      if (route === '/limit-text' && expected === 200) assert.deepEqual(JSON.parse(result.body), { text: 'éa' });
      if (route === '/unlimited-raw') assert.deepEqual(JSON.parse(result.body), { length: 5 });
    }
    for (const [charset, hex, expected] of [
      ['windows-1251', 'cff0e8e2e5f2', 'Привет'],
      ['shift_jis', '93fa967b', '日本'],
      ['gb18030', '9439da33', '💩'],
      ['big5hkscs', '8862', 'Ê̄'],
      ['utf-16be', 'feffd83ddca9', '💩'],
      ['utf-32le', 'fffe0000a9f40100', '💩'],
      ['cesu8', 'e2', '�'],
      ['utf7', '2b4141412d', '\0'],
      ['utf7imap', '264141412d', '\0'],
    ]) {
      const result = await request(parserServer, '/', { method: 'POST', headers: { 'content-type': 'text/plain; charset=' + charset }, body: Buffer.from(hex, 'hex') });
      assert.equal(result.status, 200, charset); assert.deepEqual(JSON.parse(result.body), { body: expected }, charset);
    }
    for (const [charset, parts, expected] of [
      ['gb18030', ['9439da', '33'], '💩'],
      ['big5hkscs', ['88', '62'], 'Ê̄'],
      ['utf7', ['2b414141', '2d'], '\0'],
    ]) {
      const result = await request(parserServer, '/encoded-raw?charset=' + charset, { method: 'POST', chunks: parts.map(hex => Buffer.from(hex, 'hex')) });
      assert.equal(result.status, 200); const decoded = JSON.parse(result.body);
      assert.equal(decoded.text, expected); assert.equal(decoded.chunks, parts.length, 'raw-body must receive the intended split');
    }
    for (const [route, headers, body, status] of [
      ['/encoded-raw?charset=unknown-charset', {}, 'abc', 415],
      ['/', { 'content-type': 'text/plain; charset=unknown-charset' }, 'abc', 415],
      ['/limit-raw', { 'content-type': 'application/octet-stream', 'content-encoding': 'gzip' }, Buffer.from('not gzip'), 400],
      ['/verified-json', { 'content-type': 'application/json' }, '{"a":1}', 200],
      ['/verified-json', { 'content-type': 'application/json' }, '{"a":2}', 403],
    ]) {
      const result = await request(parserServer, route, { method: 'POST', headers, body });
      assert.equal(result.status, status, route);
      if (status === 200) assert.deepEqual(JSON.parse(result.body), { a: 1 });
    }
    // JSON bodies parsed by the Functions Framework (body-parser, raw-body, type-is, http-errors).
    const echo = await request(apiServer, '/echo', { method: 'POST', headers: { 'content-type': 'application/json; CHARSET=utf-8' }, body: '{"a":1}' });
    assert.equal(echo.status, 200); assert.equal(echo.body, '{"a":1}');
    assert.equal(echo.headers['content-type'], 'application/json; charset=utf-8');
    // A parser-only override of the old body-parser silently loses charset.
    const utf16 = await request(apiServer, '/echo', { method: 'POST', headers: { 'content-type': 'application/json; CHARSET="UTF-16LE"' }, body: Buffer.from('{"word":"café"}', 'utf16le') });
    assert.equal(utf16.status, 200); assert.equal(utf16.body, '{"word":"café"}');
    const unsupportedCharset = await request(apiServer, '/echo', { method: 'POST', headers: { 'content-type': 'application/json; charset=iso-8859-1' }, body: '{"a":1}' });
    assert.equal(unsupportedCharset.status, 415);
    const malformed = await request(apiServer, '/echo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    // CORS preflight through firebase-functions.
    const preflight = await request(apiServer, '/echo', { method: 'OPTIONS', headers: { origin: 'https://ventimath.com', 'access-control-request-method': 'POST' } });
    assert.equal(preflight.status, 204); assert.equal(preflight.headers['access-control-allow-origin'], 'https://ventimath.com');
    const reflectedPreflight = await request(apiServer, '/echo', { method: 'OPTIONS', headers: { origin: 'https://ventimath.com', 'access-control-request-method': 'POST', 'access-control-request-headers': 'X-Test, Authorization' } });
    assert.equal(reflectedPreflight.headers['access-control-allow-headers'], 'X-Test, Authorization');
    assert.equal(reflectedPreflight.headers.vary, 'Origin, Access-Control-Request-Headers');
    for (let i = 0; i < 2; i++) {
      const allowedCors = await request(appServer, '/vcors-policy', { headers: { origin: 'https://allowed.ventimath.test' } });
      assert.equal(allowedCors.headers['access-control-allow-origin'], 'https://allowed.ventimath.test');
      assert.equal(allowedCors.headers['access-control-allow-credentials'], 'true');
    }
    const deniedCors = await request(appServer, '/vcors-policy', { headers: { origin: 'https://other.test' } });
    assert.equal(deniedCors.headers['access-control-allow-origin'], undefined);
    assert.equal(deniedCors.headers.vary, 'Origin');
    for (const origin of ['https://allowed.ventimath.test', 'https://other.test']) {
      const callbackCors = await request(appServer, '/vcors-callback', { headers: { origin } });
      assert.equal(callbackCors.body, 'callback policy');
      assert.equal(callbackCors.headers.vary, 'Origin');
      assert.equal(callbackCors.headers['access-control-allow-origin'], origin.endsWith('.ventimath.test') ? origin : undefined);
    }
    const framedCors = await request(appServer, '/vcors-framing', { method: 'OPTIONS', headers: { origin: 'https://allowed.ventimath.test' } });
    assert.equal(framedCors.status, 204); assert.equal(framedCors.body, '');
    assert.equal(framedCors.headers['transfer-encoding'], undefined); assert.equal(framedCors.headers.trailer, undefined);
    assert.equal(framedCors.headers['access-control-allow-headers'], 'Authorization');
    // Content-Type values pass through res.set() (mime-types), including syntax upstream tolerated.
    const pdf = await request(apiServer, '/pdf');
    assert.equal(pdf.headers['content-type'], 'application/pdf; name=report (1).pdf');
    const typed = await request(apiServer, '/typed');
    assert.equal(typed.headers['content-type'], 'application/json; charset=utf-8'); assert.equal(typed.body, '{"ok":true}');
    const parameterized = await request(apiServer, '/parameterized');
    assert.equal(parameterized.status, 200); assert.equal(parameterized.body, 'café');
    assert.equal(parameterized.headers['content-type'], 'text/plain; note="a;b"; charset=utf-8');
    // negotiator uses content-type's comma/start options to walk Accept lists;
    // a comma inside a quoted parameter must not split a media type.
    const acceptsJson = await request(apiServer, '/accept', { headers: { accept: 'text/html;q=0.5, application/json; profile="a,b";q=0.9' } });
    assert.equal(acceptsJson.status, 200); assert.deepEqual(JSON.parse(acceptsJson.body), { type: 'application/json; profile="a,b"' });
    const acceptsHtml = await request(apiServer, '/accept', { headers: { accept: 'application/json; profile="a,b";q=0, text/html;q=0.5' } });
    assert.equal(acceptsHtml.status, 200); assert.deepEqual(JSON.parse(acceptsHtml.body), { type: 'text/html' });
    // The Functions Framework disables ETags on its own app, so conditional
    // requests to plain handlers never reach etag or fresh; Express applications
    // deployed as handlers and files served by send still use them.
    const cached = await request(appServer, '/cached');
    assert.equal(cached.status, 200); assert.match(cached.headers.etag, /^W\/"/);
    const notModified = await request(appServer, '/cached', { headers: { 'if-none-match': cached.headers.etag } });
    assert.equal(notModified.status, 304); assert.equal(notModified.body, '');
    assert.equal((await request(appServer, '/cached', { headers: { 'if-none-match': cached.headers.etag, 'cache-control': 'NO-CACHE' } })).status, 200);
    assert.equal((await request(appServer, '/cached', { headers: { 'if-none-match': '"a,b", ' + cached.headers.etag } })).status, 304);
    // Redirect formatting (encodeurl, escape-html).
    const redirect = await request(apiServer, '/redirect', { headers: { accept: 'text/html' } });
    assert.equal(redirect.status, 302); assert.equal(redirect.headers.location, '/landing?next=%3Ca%20b%3E&x=%25zz');
    assert.equal(redirect.body, '<!DOCTYPE html><head><title>Found</title></head><body><p>Found. Redirecting to /landing?next=%3Ca%20b%3E&amp;x=%25zz</p></body>');
    // sendFile through send (mime-types, etag, fresh, range-parser, ms for maxAge).
    const file = await request(apiServer, '/file');
    assert.equal(file.body, content); assert.equal(file.headers['content-type'], 'text/plain; charset=utf-8');
    assert.equal(file.headers['cache-control'], 'public, max-age=86400');
    // Under the framework's etag:false setting, sendFile responses carry only Last-Modified.
    assert.equal(file.headers.etag, undefined);
    assert.equal((await request(apiServer, '/file', { headers: { 'if-modified-since': file.headers['last-modified'] } })).status, 304);
    const partial = await request(apiServer, '/file', { headers: { range: 'bytes=2-5' } });
    assert.equal(partial.status, 206); assert.equal(partial.body, '2345'); assert.equal(partial.headers['content-range'], 'bytes 2-5/20');
    assert.equal((await request(apiServer, '/file', { headers: { range: 'bytes=-1000' } })).body, content);
    assert.equal((await request(apiServer, '/file', { headers: { range: 'bytes=100-200' } })).status, 416);
    assert.equal((await request(apiServer, '/file', { headers: { range: 'bytes=1junk-4' } })).status, 200);
    assert.equal((await request(apiServer, '/file', { headers: { 'if-match': '*' } })).status, 200);
    assert.equal((await request(apiServer, '/file', { headers: { 'if-none-match': '*' } })).status, 304);
    // firebase-functions answers errors thrown by an onRequest handler itself, with a
    // structured log and a plain 500; finalhandler only sees Express applications.
    for (const route of ['/deny', '/crash']) {
      const failed = await request(apiServer, route);
      assert.equal(failed.status, 500); assert.equal(failed.body, 'Internal Server Error');
    }
    assert.ok(stderr.some(line => line.includes('"severity":"ERROR"') && line.includes('forbidden by policy')));
    assert.ok(stderr.some(line => line.includes('"severity":"ERROR"') && line.includes('unexpected failure')), 'Missing crash log; captured ERROR records: ' + JSON.stringify(stderr.filter(line => line.includes('"severity":"ERROR"'))));
    const missing = await request(apiServer, '/missing');
    assert.equal(missing.status, 404); assert.equal(missing.body, '{"error":"not found"}');

    // Real Express serialization, JSON/signed cookies, clearing and request parsing.
    const cookieResponse = await request(appServer, '/cookies', { headers: { cookie: '__proto__=ordinary; sid=first; sid=second; unicode=%E9%9B%AA' } });
    assert.equal(cookieResponse.status, 200);
    assert.deepEqual(JSON.parse(cookieResponse.body), JSON.parse('{"__proto__":"ordinary","sid":"first","unicode":"雪"}'));
    const cookieHeaders = cookieResponse.headers['set-cookie'];
    const signature = require('../packages/vcookie-signature/test/fixtures/cookie-signature-1.2.2.cjs').sign('value', 'integration-only-cookie-secret');
    assert.deepEqual(cookieHeaders.slice(0, 6), [
      'plain=value; Path=/', 'unicode=%E9%9B%AA; Path=/', 'object=j%3A%7B%22ok%22%3Atrue%7D; Path=/',
      'signed=' + encodeURIComponent('s:' + signature) + '; Path=/',
      'attrs=value; Domain=.example.com; Path=/cookies; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; Partitioned; Priority=High; SameSite=Lax',
      'custom=a/b; Path=/',
    ]);
    assert.match(cookieHeaders[6], /^max-age=value; Max-Age=1; Path=\/; Expires=/);
    const expiration = require('../packages/vcookie').parseSetCookie(cookieHeaders[6]).expires;
    assert.ok(Math.abs(expiration.getTime() - Date.now()) < 5000);
    assert.equal(cookieHeaders[7], 'gone=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    const invalidCookie = await request(appServer, '/cookie-invalid');
    assert.equal(invalidCookie.status, 500); assert.equal(invalidCookie.headers['set-cookie'], undefined);

    const signedValue = httpCookie.parse(cookieHeaders[3]).signed.slice(2);
    const verified = await request(appServer, '/signed-cookie-check', { headers: { cookie: 'sid=' + encodeURIComponent(signedValue) } });
    assert.deepEqual(JSON.parse(verified.body), { value: 'value' });
    for (const value of [signedValue + '=', 'tampered' + signedValue.slice(5)]) {
      const rejected = await request(appServer, '/signed-cookie-check', { headers: { cookie: 'sid=' + encodeURIComponent(value) } });
      assert.deepEqual(JSON.parse(rejected.body), { value: false });
    }
    const varied = await request(appServer, '/vary-fields');
    assert.equal(varied.status, 200); assert.equal(varied.headers.vary, 'Accept-Encoding, Origin, Cookie, X-Variant');
    assert.equal((await request(appServer, '/vary-wildcard')).headers.vary, '*');
    const invalidVary = await request(appServer, '/vary-invalid');
    assert.equal(invalidVary.status, 500); assert.equal(invalidVary.headers.vary, undefined);

    // The Express application: static files via serve-static, body limits, error headers, late errors.
    const page = await request(appServer, '/static/page.html');
    assert.equal(page.status, 200); assert.equal(page.headers['content-type'], 'text/html; charset=utf-8');
    assert.equal(page.headers['x-static'], 'yes');
    assert.equal(page.headers['cache-control'], 'public, max-age=7200');
    const data = await request(appServer, '/static/data.txt');
    assert.equal(data.body, content); assert.match(data.headers.etag, /^W\/"/);
    const conditional = await request(appServer, '/static/data.txt', { headers: { 'if-none-match': 'W/"x", ' + data.headers.etag, 'if-modified-since': 'Wed, 21 Oct 2015 07:28:00 GMT' } });
    assert.equal(conditional.status, 304);
    const head = await request(appServer, '/static/data.txt', { method: 'HEAD' });
    assert.equal(head.body, ''); assert.equal(head.headers['content-length'], '20');
    const dir = await request(appServer, '/static/nested%20dir');
    assert.equal(dir.status, 301); assert.equal(dir.headers.location, '/static/nested%20dir/');
    assert.equal((await request(appServer, '/static/nested%20dir/')).body, '<p>index</p>');
    assert.equal((await request(appServer, '/static/missing%a')).status, 400); assert.equal((await request(appServer, '/static/missing.txt')).status, 404);
    // send's actual Express callers inherit options with Object.create(), and
    // rely on its event order to deliver sendFile/download completion callbacks.
    const sentFile = await request(appServer, '/send-file');
    assert.equal(sentFile.body, content); assert.equal(sentFile.headers['x-custom'], 'yes');
    const sentHead = await request(appServer, '/send-file', { method: 'HEAD' });
    assert.equal(sentHead.body, ''); assert.equal(sentHead.headers['content-length'], '20');
    assert.equal((await request(appServer, '/send-file', { headers: { 'if-none-match': sentFile.headers.etag } })).status, 304);
    assert.equal((await request(appServer, '/send-file', { headers: { range: 'bytes=2-5' } })).body, '2345');
    const unsatisfied = await request(appServer, '/send-file', { headers: { range: 'bytes=100-' } });
    assert.equal(unsatisfied.status, 416); assert.equal(unsatisfied.headers['content-range'], 'bytes */20');
    assert.equal((await request(appServer, '/send-empty')).body, '');
    const download = await request(appServer, '/download');
    assert.equal(download.body, content); assert.equal(download.headers['content-disposition'], 'attachment; filename=renamed.txt');
    for (const [id, , expected] of downloadNames) {
      for (const prefix of ['download-', 'attachment-']) {
        const response = await request(appServer, '/' + prefix + id);
        assert.equal(response.status, 200);
        assert.equal(response.body, content);
        assert.equal(response.headers['content-disposition'], expected);
      }
    }
    const unicodeHead = await request(appServer, '/download-unicode', { method: 'HEAD' });
    assert.equal(unicodeHead.status, 200); assert.equal(unicodeHead.body, '');
    assert.equal(unicodeHead.headers['content-disposition'], downloadNames[0][2]);
    const unicodeRange = await request(appServer, '/download-unicode', { headers: { range: 'bytes=2-5' } });
    assert.equal(unicodeRange.status, 206); assert.equal(unicodeRange.body, '2345');
    assert.equal(unicodeRange.headers['content-disposition'], downloadNames[0][2]);
    assert.equal((await request(appServer, '/send-missing')).status, 404);
    assert.equal((await request(appServer, '/static/page')).body, '<p>page</p>');
    assert.equal((await request(appServer, '/static/.secret')).status, 404);
    assert.equal((await request(appServer, '/hidden/.secret')).status, 403);
    assert.equal((await request(appServer, '/strict/nested%20dir')).status, 404);
    assert.equal((await request(appServer, '/strict/absent')).status, 404);
    assert.equal((await request(appServer, '/static/%2e%2e/outside')).status, 404);
    assert.equal((await request(appServer, '/strict/data.txt', { method: 'POST' })).status, 405);
    const queryRedirect = await request(appServer, '/static/nested%20dir?x=1');
    assert.equal(queryRedirect.status, 301); assert.equal(queryRedirect.headers.location, '/static/nested%20dir/?x=1');
    const headRange = await request(appServer, '/send-file', { method: 'HEAD', headers: { range: 'bytes=2-5' } });
    assert.equal(headRange.status, 200); assert.equal(headRange.headers['content-length'], '20');
    assert.equal((await request(appServer, '/send-file', { headers: { 'if-match': sentFile.headers.etag } })).status, 412);
    assert.equal((await request(appServer, '/send-file', { headers: { range: 'bytes=2-5', 'if-range': sentFile.headers.etag } })).status, 200);
    const laterDate = new Date(Date.parse(data.headers['last-modified']) + 86400000).toUTCString();
    assert.equal((await request(appServer, '/static/data.txt', { headers: { range: 'bytes=2-5', 'if-range': laterDate } })).status, 200);
    // Full mount paths and queries survive Express's rewriting of req.url.
    const mount = await request(appServer, '/mounted?x=1');
    assert.equal(mount.status, 301); assert.equal(mount.headers.location, '/mounted/?x=1');
    assert.equal((await request(appServer, '/mounted/?x=1')).body, '<p>page</p>');
    const mountHead = await request(appServer, '/mounted?x=1', { method: 'HEAD' });
    assert.equal(mountHead.status, 301); assert.equal(mountHead.body, '');
    assert.equal(mountHead.headers['content-length'], mount.headers['content-length']);
    for (const method of ['GET', 'HEAD', 'POST']) {
      const generated = await request(appServer, '/static-framing/nested%20dir?x=1', { method });
      assert.equal(generated.status, method === 'POST' ? 405 : 301);
      for (const name of ['transfer-encoding', 'trailer', 'content-encoding', 'content-range']) assert.equal(generated.headers[name], undefined);
      if (method === 'POST') assert.equal(generated.headers.allow, 'GET, HEAD');
      if (method !== 'GET') assert.equal(generated.body, '');
    }
    assert.equal((await request(appServer, '/body', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"a":1}' })).body, '{"a":1}');
    // The framework's own body-parser runs first, so the application's limit is never consulted.
    assert.equal((await request(appServer, '/body', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(100) }) })).status, 200);
    const error = await request(appServer, '/error');
    assert.equal(error.status, 401); assert.equal(error.headers['www-authenticate'], 'Basic');
    const framing = await request(appServer, '/framing');
    assert.equal(framing.status, 429); assert.equal(framing.headers['retry-after'], '5'); assert.equal(framing.headers['transfer-encoding'], undefined);
    const double = await request(appServer, '/double?token=secret');
    assert.equal(double.status, 404); assert.match(double.body, /Cannot GET \/double/); assert.doesNotMatch(double.body, /secret/);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(stderr.some(line => line.includes('late error')), 'an error after the 404 must still be logged');
    for (const name of ['file', 'empty', 'download', ...downloadNames.map(([id]) => 'download-' + id)]) assert.ok(completed.includes(name), `missing ${name} completion callback`);
    assert.ok(failures.some(error => error.status === 404), 'missing sendFile error callback');

    // Duration strings (ms) through jsonwebtoken, as ventimath signs tokens.
    const token = jwt.sign({ sub: 'student' }, 'secret', { expiresIn: '2 hours' });
    const claims = jwt.verify(token, 'secret');
    assert.equal(claims.exp - claims.iat, 7200);
    const constrained = jwt.sign({ iat: 0, sub: 'student', nonce: 'integration' }, 'secret',
      { expiresIn: 120, audience: 'vpm-test', issuer: 'ventimath', keyid: 'integration-key' });
    const resolvedClaims = await new Promise((resolve, reject) => jwt.verify(constrained, (header, done) => {
      assert.equal(header.kid, 'integration-key');
      setImmediate(() => done(null, 'secret'));
    }, { clockTimestamp: 60, audience: 'vpm-test', issuer: 'ventimath', nonce: 'integration', maxAge: 90 },
    (error, value) => error ? reject(error) : resolve(value)));
    assert.equal(resolvedClaims.iat, 0);
    assert.throws(() => jwt.verify(constrained, 'secret', { clockTimestamp: 120 }), jwt.TokenExpiredError);
    assert.throws(() => jwt.verify(constrained, 'secret', { clockTimestamp: 60, audience: 'wrong' }), /audience invalid/);

    // Real JWT and Google-auth consumers exercise VPM JWS/JWA offline.
    const { keys } = require('../packages/vjwa/test/helpers.cjs');
    for (const family of ['HS', 'RS', 'PS', 'ES']) for (const bits of [256, 384, 512]) {
      const algorithm = family + bits;
      const pair = keys[family === 'ES' ? algorithm : 'RSA'];
      const signing = family === 'HS' ? 'integration-secret' : pair.privateKey;
      const verifying = family === 'HS' ? signing : pair.publicKey;
      const signed = jwt.sign({ sub: 'student', aud: 'vpm-test' }, signing, { algorithm, noTimestamp: true });
      assert.equal(jwt.verify(signed, verifying, { algorithms: [algorithm], audience: 'vpm-test' }).sub, 'student');
      const parts = signed.split('.');
      parts[2] = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
      assert.throws(() => jwt.verify(parts.join('.'), verifying, { algorithms: [algorithm] }), /invalid signature/);
      const asynchronous = await new Promise((resolve, reject) => jwt.sign({ sub: 'async-student' }, signing,
        { algorithm, noTimestamp: true, keyid: 'clé 雪' }, (error, value) => error ? reject(error) : resolve(value)));
      assert.equal(jwt.verify(asynchronous, verifying, { algorithms: [algorithm] }).sub, 'async-student');
      assert.equal(jwt.decode(asynchronous, { complete: true }).header.kid, 'clé 雪');
    }
    const { JWTAccess } = from('google-auth-library');
    const access = new JWTAccess('test@example.invalid', keys.RSA.privatePem, 'test-key');
    const authorization = access.getRequestHeaders('https://example.invalid').Authorization;
    const accessClaims = jwt.verify(authorization.slice('Bearer '.length), keys.RSA.publicKey,
      { algorithms: ['RS256'], audience: 'https://example.invalid', issuer: 'test@example.invalid' });
    assert.equal(accessClaims.sub, 'test@example.invalid');

    // Current Google Auth consumer surface used by Storage and gax upgrades.
    const currentAuth = require('./google-http-conformance/node_modules/google-auth11');
    const latestAccess = new currentAuth.JWTAccess('test@example.invalid', keys.RSA.privatePem, 'test-key');
    const latestAuthorization = latestAccess.getRequestHeaders('https://example.invalid').get('authorization');
    assert.equal(jwt.verify(latestAuthorization.slice(7), keys.RSA.publicKey, {algorithms:['RS256'],audience:'https://example.invalid'}).sub, 'test@example.invalid');
    const latestAuth = new currentAuth.GoogleAuth({projectId:'vpm-integration',authClient:new currentAuth.JWT({email:'test@example.invalid',key:keys.RSA.privatePem})});
    assert.equal(await latestAuth.getProjectId(),'vpm-integration');
    const latestSignature=await latestAuth.sign('cloud-storage-signing-input');
    assert.equal(require('node:crypto').verify('sha256',Buffer.from('cloud-storage-signing-input'),keys.RSA.publicKey,Buffer.from(latestSignature,'base64')),true);

    // Firebase Admin's real App Check key-fetch/verification path, served locally.
    const firebaseJwt = from(path.join(path.dirname(resolveManifest(from, 'firebase-admin')), 'lib/utils/jwt.js'));
    const publicJwk = { ...keys.RSA.publicKey.export({ format:'jwk' }), kid:'integration-key', alg:'RS256', use:'sig' };
    let jwksRequests = 0;
    const jwksServer = http.createServer((_req,res) => { jwksRequests++; res.setHeader('content-type','application/json'); res.end(JSON.stringify({keys:[publicJwk]})); });
    await new Promise(resolve=>jwksServer.listen(0,'127.0.0.1',resolve));
    try {
      const uri = 'http://127.0.0.1:' + jwksServer.address().port + '/keys';
      const fetcher = new firebaseJwt.JwksFetcher(uri);
      const fetched = await fetcher.fetchPublicKeys();
      assert.match(fetched['integration-key'],/PUBLIC KEY/);
      assert.deepEqual(await fetcher.fetchPublicKeys(),fetched);
      assert.equal(jwksRequests,1);
      const verifier = firebaseJwt.PublicKeySignatureVerifier.withJwksUrl(uri);
      const signed = jwt.sign({sub:'app-check-test'},keys.RSA.privateKey,{algorithm:'RS256',keyid:'integration-key'});
      await verifier.verify(signed);
      const wrong = jwt.sign({sub:'app-check-test'},keys.RSA.privateKey,{algorithm:'RS256',keyid:'missing'});
      await assert.rejects(verifier.verify(wrong));
      const direct = from('jwks-rsa')({jwksUri:uri});
      const resolved = await new Promise((resolve,reject)=>jwt.verify(signed,(header,done)=>direct.getSigningKey(header.kid,(error,key)=>done(error,key?.getPublicKey())),{algorithms:['RS256']},(error,payload)=>error?reject(error):resolve(payload)));
      assert.equal(resolved.sub,'app-check-test');
    } finally { jwksServer.closeAllConnections(); await new Promise(resolve=>jwksServer.close(resolve)); }

    await require('./agent-conformance/consumer.cjs')(from);
    await require('./google-http-conformance/consumer.cjs')(from);
    await require('./retry-request-conformance/callers.cjs')(replacements['retry-request']);
    await require('./stream-events-conformance/callers.cjs')(replacements['stream-events'], false, false);
    await require('./http-proxy-conformance/callers.cjs')(replacements['http-proxy-agent']);
    await require('./teeny-conformance/callers.cjs')(replacements['teeny-request']);
    await require('./duplexify-conformance/callers.cjs')(replacements.duplexify);
    await require('./paginator-conformance/callers.cjs')(replacements['@google-cloud/paginator']);
    await require('./numbers-conformance/callers.cjs')();
    await require('./xml-helpers-conformance/callers.cjs')();
    await require('./path-matcher-conformance/callers.cjs')();
    await require('./nodable-entities-conformance/callers.cjs')();
    await require('./xml-builder-conformance/callers.cjs')();
    await require('./xml-parser-conformance/callers.cjs')();
    await require('./mime-conformance/callers.cjs')();
    await require('./gax-conformance/callers.cjs')();
    await require('./otel-conformance/callers.cjs')(replacements['@opentelemetry/api']);
    await require('./grpc-conformance/callers.cjs')(replacements['@grpc/grpc-js']);
    require('./ordered-map-conformance/callers.cjs')(replacements['@js-sdsl/ordered-map']);
    await require('./grpc-loader-conformance/callers.cjs')(replacements['@grpc/proto-loader']);
    require('./camelcase-conformance/callers.cjs')(replacements['lodash.camelcase']);
    await require('./protojson-conformance/callers.cjs')();
    require('./protobuf-conformance/callers.cjs')();
    require('./long-conformance/callers.cjs')();
    require('./object-hash-conformance/callers.cjs')();
    await require('./storage-conformance/callers.cjs')();
    await require('./storage-conformance/firebase.cjs')();
    require('./entities-conformance/callers.cjs')(replacements['html-entities']);
    await require('./retry-conformance/callers.cjs')(replacements['async-retry']);
    await require('./queue-limit-conformance/callers.cjs')(replacements['p-limit']);
    await require('./cloud-utils-conformance/callers.cjs')(replacements['@google-cloud/promisify'],replacements['@google-cloud/projectify']);

    // Debug namespaces from the consumers reached vdebug's output.
    for (const namespace of ['express:application', 'router', 'send', 'body-parser:json', 'finalhandler']) {
      assert.ok(stderr.some(line => line.startsWith(namespace)), `no debug output for ${namespace}`);
    }
    for (const [name, count] of Object.entries(calls)) {
      // Current Gaxios no longer needs is-stream; the historical alias remains testable in its own suite.
      if (name === 'is-stream') {assert.equal(count, 0); continue;}
      assert.ok(count > 0, `${name} was aliased but never reached`);
    }
  } finally {
    process.removeListener('deprecation', recordDeprecation);
    process.stderr.write = writeStderr;
    console.error = consoleError;
    for (const server of [apiServer, appServer, parserServer]) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    fs.rmSync(directory, { recursive: true, force: true });
  }
  const runtime = process.versions.bun ? 'Bun ' + process.versions.bun : 'Node ' + process.version;
  const installed = name => require(path.join(modules, name, 'package.json')).version;
  console.log(`${runtime}: ${checks} HTTP checks passed through vfunctions-framework (replacing ${installed('@google-cloud/functions-framework')}), firebase-functions ${installed('firebase-functions')}, express ${installed('express')}.`);
  console.log('6 Functions Framework startup-option checks passed.');
  console.log('12 JWT algorithms: synchronous/asynchronous signing, Unicode headers, tamper rejection, claims, asynchronous key resolution and Google JWTAccess signing passed through vjsonwebtoken/vjws/vjwa.');
  console.log('HTTPS proxy consumer: HTTP and TLS tunnels, keep-alive reuse and gaxios requests passed through vhttps-proxy-agent/vagent-base.');
  console.log('Firebase Admin JWKS retrieval, cache reuse, signature verification, unknown-key rejection and JWT key resolution passed through vjwks-rsa.');
  console.log(`${readerParityChecks} raw package-reader comparisons and 3 framework CJS/ESM loading cases passed.`);
  console.log(`Shared content-type ${[...contentTypes.values()][0]}: ${[...contentTypeCallers].sort().join(', ')}.`);
  console.log('Aliased: ' + [...aliased.keys()].map(label => `${label} ×${calls[label.replace(/@[^@]+$/, '')]}`).join(', '));
  console.log('Outside this run’s caller-version alias scope (built replacements may exist): ' + ([...uncovered].map(([label, via]) => `${label} (via ${[...via].join(', ')})`).join('; ') || 'none'));
}

run().catch(error => { console.error(error); process.exitCode = 1; });
