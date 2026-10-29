'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const vm = require('node:vm');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');
const framework = require('..');
const testing = require('../testing');
const { getServer } = require('../lib/server');
const { parseOptions, OptionsError } = require('../lib/options');
const context = require('../lib/async_local_storage');
const logger = require('../lib/logger');
const { timeoutMiddleware } = require('../lib/middleware/timeout');
const { getUserFunction } = require('../lib/loader');
const defaults = () => parseOptions(['node', 'framework'], {});
const request = (server, { method = 'GET', route = '/', headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port: server.address().port, path: route, method, headers, agent: false }, res => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    res.on('error', reject);
  });
  req.on('error', reject); req.end(body);
});
async function withServer(handler, options, callback) {
  const server = getServer(handler, { ...defaults(), ...options });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try { return await callback(server); }
  finally { await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }); }
}
async function quiet(callback) {
  const original = console.error; console.error = () => {};
  try { return await callback(); } finally { console.error = original; }
}

test('concurrent initial requests retain separate contexts across awaits', async () => {
  const results = await Promise.all(Array.from({ length: 30 }, (_, i) => new Promise((resolve, reject) => {
    context.asyncLocalStorageMiddleware({ executionId: String(i), spanId: 'span' + i }, {}, () => {
      setImmediate(() => { try { assert.deepEqual(context.getCurrentContext(), { executionId: String(i), spanId: 'span' + i }); resolve(); } catch (e) { reject(e); } });
    });
  })));
  assert.equal(results.length, 30); assert.equal(context.getCurrentContext(), undefined);
});

test('registration supports replacement and testing lookup', () => {
  const first = () => {}; const second = () => {};
  framework.http('registered', first); assert.equal(testing.getFunction('registered'), first);
  framework.http('registered', second); assert.equal(testing.getFunction('registered'), second);
  assert.equal(testing.getFunction('missing'), undefined);
  assert.throws(() => testing.getTestServer('missing'), /not registered/);
});
for (const name of ['', '-bad', 'ends-', 'a'.repeat(64), 42, { toString: () => 'valid' }]) {
  test('registration rejects invalid name ' + String(name), () => assert.throws(() => framework.http(name, () => {})));
}
test('registration rejects non-callable handlers', () => {
  for (const value of [null, undefined, {}, 1, 'handler']) assert.throws(() => framework.cloudEvent('badHandler', value), TypeError);
});

for (const [name, make] of [
  ['thenable', () => ({ then(resolve, reject) { reject(new Error('rejected handler')); } })],
  ['cross-realm promise', () => vm.runInNewContext('Promise.reject(new Error("rejected handler"))')],
  ['throwing then getter', () => ({ get then() { throw new Error('rejected handler'); } })],
  ['null rejection', () => Promise.reject(null)],
]) test('HTTP catches ' + name, () => quiet(() => withServer(() => make(), {}, async server => {
  const result = await request(server);
  assert.equal(result.status, 500); assert.equal(result.headers['x-google-status'], 'crash');
})));

test('thenable getter is read once and rejection is sent once', () => quiet(() => {
  let reads = 0;
  return withServer(() => ({ get then() { reads++; return (_, reject) => { reject(new Error('one')); reject(new Error('two')); }; } }), {}, async server => {
    assert.equal((await request(server)).status, 500); assert.equal(reads, 1);
  });
}));

test('ordinary response return reads a non-callable then getter once', () => {
  let reads = 0;
  return withServer((req, res) => {
    Object.defineProperty(res, 'then', { get() { reads++; return 42; } });
    return res.json({ ok: true });
  }, {}, async server => {
    const result = await request(server);
    assert.equal(result.status, 200); assert.equal(result.body, '{"ok":true}');
    assert.equal(reads, 1);
  });
});

test('custom thenables preserve deferred invocation, receiver and first settlement', async () => {
  const errors = []; const original = console.error;
  console.error = (...args) => errors.push(args);
  try {
    await withServer((req, res) => {
      let afterGetter = false;
      const returned = function () {};
      const then = function (resolve, reject) {
        assert.equal(this, returned); assert.equal(afterGetter, true);
        resolve(undefined); reject(new Error('ignored rejection'));
        res.end('settled'); throw new Error('ignored throw');
      };
      then.call = () => { throw new Error('must use the actual callable'); };
      let reads = 0;
      Object.defineProperty(returned, 'then', { get() {
        assert.equal(++reads, 1);
        queueMicrotask(() => { afterGetter = true; });
        return then;
      } });
      return returned;
    }, {}, async server => {
      const result = await request(server);
      assert.equal(result.status, 200); assert.equal(result.body, 'settled');
      await new Promise(resolve => setImmediate(resolve));
      assert.deepEqual(errors, []);
    });
  } finally { console.error = original; }
});

test('promise rejection with an own then getter still reads it once', () => quiet(() => {
  let reads = 0;
  return withServer(() => {
    const result = Promise.reject(new Error('native rejection'));
    Object.defineProperty(result, 'then', { get() { reads++; return Promise.prototype.then; } });
    return result;
  }, {}, async server => {
    assert.equal((await request(server)).status, 500); assert.equal(reads, 1);
  });
}));

for (const [type, body, expected] of [
  ['application/json', '{"a":1}', { a: 1 }],
  ['application/cloudevents+json', '{"id":"one"}', { id: 'one' }],
  ['text/plain', 'hello', 'hello'],
  ['application/x-www-form-urlencoded', 'a[b]=hello', { a: { b: 'hello' } }],
  ['application/octet-stream', 'binary', { type: 'Buffer', data: [...Buffer.from('binary')] }],
]) test('HTTP body and rawBody: ' + type, () => withServer((req, res) => res.json({ body: req.body, raw: req.rawBody.toString() }), {}, async server => {
  const result = await request(server, { method: 'POST', headers: { 'content-type': type }, body });
  assert.equal(result.status, 200); assert.deepEqual(JSON.parse(result.body), { body: expected, raw: body });
  assert.equal(result.headers.etag, undefined); assert.equal(result.headers['x-powered-by'], undefined);
}));

test('body dispatch preserves mixed-case media types, whitespace and parameters', () => withServer((req, res) => {
  res.json({ body: req.body, raw: req.rawBody?.toString() });
}, {}, async server => {
  const cases = [
    ['application/json', '{"a":1}', { a: 1 }],
    ['application/cloudevents+json', '{"id":"one"}', { id: 'one' }],
    ['text/plain', 'hello', 'hello'],
    ['application/x-www-form-urlencoded', 'a[b]=hello', { a: { b: 'hello' } }],
    ['application/octet-stream', 'bytes', { type: 'Buffer', data: [...Buffer.from('bytes')] }],
  ];
  for (const [type, body, parsed] of cases) {
    for (const name of [type, type.toUpperCase(), type.replace(/[a-z]/g, (c, i) => i % 2 ? c.toUpperCase() : c)]) {
      for (const suffix of ['', '; charset=utf-8', ' \t; CHARSET="UTF-8"; note="x;y"']) {
        const r = await request(server, { method: 'POST', headers: { 'content-type': name + suffix }, body });
        assert.equal(r.status, 200, name + suffix);
        assert.deepEqual(JSON.parse(r.body), { body: parsed, raw: body });
      }
    }
  }
}));

test('unknown, missing and invalid media types retain raw or unparsed bodies', () => withServer((req, res) => {
  res.json({ body: req.body, raw: req.rawBody?.toString() });
}, {}, async server => {
  for (const type of ['application/problem+json', 'text/json', 'application/xml', 'constructor', 'application/json, text/plain', '', undefined]) {
    const headers = { 'content-length': '7' }; if (type !== undefined) headers['content-type'] = type;
    const r = await request(server, { method: 'POST', headers, body: '{"a":1}' });
    assert.equal(r.status, 200);
    const raw = ['application/problem+json', 'text/json', 'application/xml'].includes(type);
    assert.deepEqual(JSON.parse(r.body), raw ? { body: { type: 'Buffer', data: [...Buffer.from('{"a":1}')] }, raw: '{"a":1}' } : {});
  }
}));

test('JSON and form dispatch retain strict parsing, charset and encoding errors', () => quiet(() => {
  let calls = 0;
  return withServer((req, res) => { calls++; res.end('unexpected'); }, {}, async server => {
    for (const [type, body, status, extra] of [
      ['application/json', '{bad}', 400], ['application/cloudevents+json', 'true', 400],
      ['application/json; charset=iso-8859-1', '{"a":1}', 415],
      ['application/x-www-form-urlencoded; charset=utf-16', 'a=1', 415],
      ['application/json', '{}', 415, { 'content-encoding': 'unknown' }],
    ]) {
      const r = await request(server, { method: 'POST', headers: { 'content-type': type, ...extra }, body });
      assert.equal(r.status, status, type);
    }
    assert.equal(calls, 0);
  });
}));

test('compressed dispatch preserves inflated rawBody and decoded data', () => {
  const zlib = require('node:zlib');
  return withServer((req, res) => res.json({ body: req.body, raw: req.rawBody.toString() }), {}, async server => {
    for (const [encoding, compress] of [['gzip', zlib.gzipSync], ['br', zlib.brotliCompressSync], ['deflate', zlib.deflateSync]]) {
      for (const [type, body, parsed] of [
        ['application/json', '{"a":1}', { a: 1 }],
        ['application/x-www-form-urlencoded', 'a[b]=one', { a: { b: 'one' } }],
        ['application/cloudevents+json', '{"id":"1"}', { id: '1' }],
      ]) {
        const r = await request(server, { method: 'POST', headers: { 'content-type': type, 'content-encoding': encoding }, body: compress(Buffer.from(body)) });
        assert.equal(r.status, 200); assert.deepEqual(JSON.parse(r.body), { body: parsed, raw: body });
      }
    }
  });
});

test('form dispatch retains parameter and nesting limits', () => quiet(() => {
  let calls = 0;
  return withServer((req, res) => { calls++; res.end(); }, {}, async server => {
    for (const [body, status] of [[Array.from({ length: 1001 }, (_, i) => 'a' + i + '=1').join('&'), 413], ['a' + '[b]'.repeat(34) + '=1', 400]]) {
      const r = await request(server, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
      assert.equal(r.status, status);
    }
    assert.equal(calls, 0);
  });
}));

test('empty bodies and text/binary charsets preserve parser-specific behavior', () => withServer((req, res) => {
  res.json({ body: req.body, raw: req.rawBody?.toString('hex') });
}, {}, async server => {
  for (const type of ['application/json', 'application/cloudevents+json', 'application/x-www-form-urlencoded']) {
    const r = await request(server, { method: 'POST', headers: { 'content-type': type, 'content-length': '0' }, body: '' });
    assert.deepEqual(JSON.parse(r.body), { body: {}, raw: '' });
  }
  for (const [type, expected] of [
    ['text/plain; charset=iso-8859-1', 'é'],
    ['application/octet-stream; charset=unknown', { type: 'Buffer', data: [233] }],
  ]) {
    const r = await request(server, { method: 'POST', headers: { 'content-type': type }, body: Buffer.from([233]) });
    assert.equal(r.status, 200); assert.deepEqual(JSON.parse(r.body), { body: expected, raw: 'e9' });
  }
}));

test('HTTP route, ignored routes, HEAD and query behavior', () => withServer((req, res) => res.json({ path: req.path, query: req.query, params: req.params }), {}, async server => {
  assert.equal((await request(server, { route: '/favicon.ico' })).status, 404);
  assert.equal((await request(server, { route: '/robots.txt' })).status, 404);
  assert.deepEqual(JSON.parse((await request(server, { route: '/a/b?x=1' })).body), { path: '/a/b', query: { x: '1' }, params: { splat: ['a', 'b'] } });
  assert.equal((await request(server, { method: 'HEAD' })).body, '');
}));

test('concurrent HTTP handlers see their own execution and trace IDs', () => withServer(async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 5)); res.json(context.getCurrentContext());
}, {}, async server => {
  await Promise.all(Array.from({ length: 20 }, async (_, i) => {
    const r = await request(server, { headers: { 'function-execution-id': String(i), 'x-cloud-trace-context': 'abc/' + i + ';o=1' } });
    assert.deepEqual(JSON.parse(r.body), { executionId: String(i), spanId: String(i) });
  }));
}));

test('HTTP invocation preserves two arguments and the plain-call receiver', () => withServer(function (req, res) {
  assert.equal(arguments.length, 2); assert.equal(this, undefined);
  assert.equal(req.abortController, undefined);
  res.end('ok');
}, {}, async server => { assert.equal((await request(server)).body, 'ok'); }));

for (const signatureType of ['event', 'cloudevent']) test('concurrent ' + signatureType + ' callbacks retain request context', async () => {
  function finish(id, done) {
    const initial = context.getCurrentContext().executionId;
    setTimeout(() => done(null, { id, initial, later: context.getCurrentContext().executionId }), Number(id) % 4);
  }
  const handler = signatureType === 'event' ? function (data, event, done) {
    assert.equal(arguments.length, 3); finish(event.eventId, done);
  } : function (event, done) {
    assert.equal(arguments.length, 2); finish(event.id, done);
  };
  await withServer(handler, { signatureType }, async server => {
    await Promise.all(Array.from({ length: 24 }, async (_, index) => {
      const id = String(index);
      const event = signatureType === 'event' ? { data: {}, context: { eventId: id } } :
        { specversion: '1.0', id, type: 'example', source: '/test', data: {} };
      const r = await request(server, { method: 'POST', headers: { 'function-execution-id': id,
        'content-type': signatureType === 'event' ? 'application/json' : 'application/cloudevents+json' }, body: JSON.stringify(event) });
      assert.equal(r.status, 200); assert.deepEqual(JSON.parse(r.body), { id, initial: id, later: id });
    }));
  });
});

for (const mode of ['structured', 'binary']) test('CloudEvent ' + mode + ' delivery and method filtering', async () => {
  const event = { specversion: '1.0', id: 'one', type: 'example.created', source: '/test', data: { value: 42 } };
  let seen;
  await withServer(received => { seen = received; }, { signatureType: 'cloudevent' }, async server => {
    const headers = mode === 'structured' ? { 'content-type': 'application/cloudevents+json' }
      : { 'content-type': 'application/json', 'ce-specversion': '1.0', 'ce-id': 'one', 'ce-type': event.type, 'ce-source': '/test' };
    const r = await request(server, { method: 'POST', headers, body: JSON.stringify(mode === 'structured' ? event : event.data) });
    assert.equal(r.status, 204); assert.equal(seen.id, event.id); assert.deepEqual(seen.data, event.data);
    assert.equal((await request(server)).status, 404);
  });
});
test('legacy callback events return the result once', () => withServer((data, event, done) => {
  done(null, { value: data.value, id: event.eventId }); done(null, 'ignored');
}, { signatureType: 'event' }, async server => {
  const r = await request(server, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"data":{"value":5},"context":{"eventId":"one"}}' });
  assert.deepEqual(JSON.parse(r.body), { value: 5, id: 'one' });
}));

test('conversion tables do not recognize inherited event-type names', () => {
  const { backgroundEventToCloudEventMiddleware: toCloud } = require('../lib/middleware/background_event_to_cloud_event');
  const { cloudEventToBackgroundEventMiddleware: toLegacy } = require('../lib/middleware/cloud_event_to_background_event');
  for (const type of ['constructor', 'toString', '__proto__']) {
    const body = { data: { value: 1 }, context: { eventType: type, resource: 'anything' } };
    let calls = 0;
    const background = { body, headers: {}, header: () => undefined };
    toCloud(background, {}, () => calls++);
    assert.equal(background.body, body);
    const headers = { 'ce-type': type, 'ce-specversion': '1.0', 'ce-source': '/example', 'ce-id': '1' };
    const cloud = { body: { value: 1 }, headers, header: name => headers[name] };
    toLegacy(cloud, {}, () => calls++);
    assert.equal(cloud.body.context.type, type); assert.deepEqual(cloud.body.data, { value: 1 });
    assert.equal(calls, 2);
  }
});

function inContext(fn) { context.asyncLocalStorageMiddleware({ executionId: 'execution', spanId: 'span' }, {}, fn); }
test('logging includes only bytes inside Buffer and Uint8Array views', () => inContext(() => {
  const bytes = Buffer.from('SECRET!hello!SECRET');
  for (const data of [bytes.subarray(7, 12), new Uint8Array(bytes.buffer, bytes.byteOffset + 7, 5)]) {
    const out = JSON.parse(logger.getModifiedData(data)); assert.equal(out.message, 'hello');
    assert.equal(out['logging.googleapis.com/labels'].execution_id, 'execution');
  }
}));
for (const text of ['null', '42', 'true', '"hello"', '[1,2]', '{"logging.googleapis.com/labels":null}', '{"logging.googleapis.com/labels":1}']) {
  test('logging tolerates scalar JSON and malformed labels: ' + text, () => inContext(() => {
    const out = JSON.parse(logger.getModifiedData(text)); assert.equal(out['logging.googleapis.com/labels'].execution_id, 'execution');
    if (!text.startsWith('{')) assert.equal(out.message, text);
  }));
}
test('logging interception is idempotent and preserves encoding outside requests', () => {
  const stdout = process.stdout.write; const stderr = process.stderr.write; const seen = [];
  try {
    process.stdout.write = (...args) => { seen.push(args); return false; };
    process.stderr.write = () => true;
    logger.loggingHandlerAddExecutionContext(); const wrapped = process.stdout.write;
    logger.loggingHandlerAddExecutionContext(); assert.equal(process.stdout.write, wrapped);
    const callback = () => {}; assert.equal(process.stdout.write('e9', 'hex', callback), false);
    assert.deepEqual(seen, [['e9', 'hex', callback]]);
    inContext(() => process.stdout.write(Buffer.from('hello'), callback));
    assert.equal(JSON.parse(seen[1][0]).message, 'hello'); assert.equal(seen[1][1], 'utf8'); assert.equal(seen[1][2], callback);
  } finally { process.stdout.write = stdout; process.stderr.write = stderr; }
});

function timeoutPair() {
  const req = new EventEmitter(); const res = new EventEmitter(); const timeouts = [];
  req.setTimeout = value => timeouts.push(value);
  timeoutMiddleware(50)(req, res, () => {});
  return { req, res, signal: req.abortController.signal, timeouts };
}
test('request body completion does not finish execution or cancel the handler', () => {
  const { req, res, signal, timeouts } = timeoutPair(); req.emit('end'); req.emit('close');
  assert.equal(signal.aborted, false); res.emit('timeout');
  assert.equal(signal.aborted, true); assert.equal(signal.reason, 'timeout'); assert.deepEqual(timeouts, [50, 0]);
  assert.equal(req.listenerCount('aborted'), 0); assert.equal(res.listenerCount('close'), 0);
});
test('response finish cleans up without aborting', () => {
  const { req, res, signal } = timeoutPair(); res.writableFinished = true; res.emit('finish'); res.emit('close'); res.emit('timeout');
  assert.equal(signal.aborted, false); assert.equal(req.listenerCount('aborted'), 0); assert.equal(res.listenerCount('timeout'), 0);
});
for (const event of ['aborted', 'close']) test('client ' + event + ' aborts unfinished execution', () => {
  const { req, res, signal } = timeoutPair(); (event === 'aborted' ? req : res).emit(event);
  assert.equal(signal.aborted, true); assert.equal(signal.reason, 'request closed');
});
test('real idle timeout aborts after the request body has completed', () => withServer((req, res) => {
  req.abortController.signal.addEventListener('abort', () => res.status(504).send(req.abortController.signal.reason), { once: true });
}, { timeoutMilliseconds: 30 }, async server => {
  const result = await request(server, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'complete body' });
  assert.equal(result.status, 504); assert.equal(result.body, 'timeout');
}));

for (const value of ['1second', '1.5', 'Infinity', '-1', '', '2147484']) test('reject invalid timeout ' + JSON.stringify(value), () => {
  assert.throws(() => parseOptions(['node', 'framework', '--timeout=' + value], {}), OptionsError);
});
test('valid timeout boundaries and CLI precedence', () => {
  assert.equal(parseOptions(['node', 'framework', '--timeout=2147483'], {}).timeoutMilliseconds, 2147483000);
  assert.equal(parseOptions(['node', 'framework', '--timeout=0'], { CLOUD_RUN_TIMEOUT_SECONDS: '10' }).timeoutMilliseconds, 0);
});

test('loader handles CJS, ESM and nested exports, rejects inherited exports', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vframework-loader-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{"main":"index.js"}');
    fs.writeFileSync(path.join(tmp, 'index.js'), 'exports.nested = { hello() {} }; exports.empty = null;');
    fs.writeFileSync(path.join(tmp, 'event.mjs'), 'export function hello() {}');
    assert.equal(typeof (await getUserFunction(tmp, 'nested.hello', 'http')).userFunction, 'function');
    assert.equal(typeof (await getUserFunction(path.join(tmp, 'event.mjs'), 'hello', 'http')).userFunction, 'function');
    await quiet(async () => {
      for (const name of ['toString', 'constructor', 'nested.toString', 'empty.child']) assert.equal(await getUserFunction(tmp, name, 'http'), null);
    });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('CLI starts an exported function and reports startup errors', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vframework-cli-'));
  fs.writeFileSync(path.join(tmp, 'index.cjs'), 'exports.hello = (req,res) => res.end("cli-ready");');
  const cli = path.resolve(__dirname, '../lib/main.js');
  async function child(args, invoke) {
    const proc = spawn(process.execPath, [cli, ...args], { env: { ...process.env, NODE_ENV: 'development' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; let errors = '';
    const exited = new Promise(resolve => proc.once('close', (code, signal) => resolve({ code, signal })));
    proc.stderr.on('data', c => { errors += c; });
    const timer = setTimeout(() => proc.kill('SIGKILL'), 10000);
    try {
      if (invoke) {
        const port = await new Promise((resolve, reject) => {
          proc.stdout.on('data', c => { output += c; const match = output.match(/localhost:(\d+)\//); if (match) resolve(Number(match[1])); });
          proc.once('close', code => reject(new Error('CLI exited ' + code + ': ' + errors)));
        });
        assert.equal((await request({ address: () => ({ port }) })).body, 'cli-ready'); proc.kill('SIGTERM');
      } else proc.stdout.on('data', c => { output += c; });
      return { ...await exited, output, errors };
    } finally { clearTimeout(timer); if (proc.exitCode === null && !proc.killed) proc.kill('SIGKILL'); }
  }
  try {
    const args = ['--source=' + path.join(tmp, 'index.cjs'), '--target=hello', '--port=0'];
    assert.equal((await child(args, true)).code, 0);
    assert.equal((await child(['--timeout=oops'])).code, 1);
    assert.match((await child(['--help'])).errors, /vfunctions-framework/);
    assert.equal((await child(['--source=' + tmp, '--target=missing'])).code, 1);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
