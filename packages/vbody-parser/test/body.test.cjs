'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const zlib = require('node:zlib');
const { createHash } = require('node:crypto');
const parser = require('..');
const before = require('./upstream.cjs');
const iconv = require('viconv-lite');
const { exchange, incoming, invoke } = require('./helpers.cjs');
const jsonHeader = { 'content-type': 'application/json' };
const formHeader = { 'content-type': 'application/x-www-form-urlencoded' };

test('upstream provenance and the complete nine-dependency VPM boundary', () => {
  for (const [file, hash] of Object.entries(require('../PROVENANCE.json').sha256)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'fixtures/body-parser-2.4.0', file))).digest('hex'), hash, file);
  }
  const dependencies = require('../package.json').dependencies;
  assert.equal(Object.keys(dependencies).length, 9);
  for (const name of Object.keys(dependencies)) assert.match(name, /^v/);
  assert.throws(() => parser(), /individual middleware/);
});

test('normal JSON, raw, text and form requests match upstream middleware', async () => {
  const cases = [
    ['json', '{}', {}, jsonHeader], ['json', ' \t\r\n[1,2,3]', {}, jsonHeader],
    ['json', '{"name":"café 💩"}', {}, jsonHeader], ['json', '', {}, jsonHeader],
    ['json', 'null', { strict: false }, jsonHeader], ['json', '123', { strict: false }, jsonHeader],
    ['json', '{"a":2}', { reviver: (key, value) => key === 'a' ? value * 2 : value }, jsonHeader],
    ['json', 'not json', {}, { 'content-type': 'text/plain' }],
    ['raw', Buffer.from([0, 1, 255]), {}, { 'content-type': 'application/octet-stream; charset=unknown' }],
    ['text', 'hello 💩', {}, { 'content-type': 'text/plain' }],
    ['text', '', {}, { 'content-type': 'text/plain' }],
    ['urlencoded', 'a=1&a=2&person[name]=Ada', {}, formHeader],
    ['urlencoded', 'a=1&a=2&person[name]=Ada', { extended: true }, formHeader],
    ['urlencoded', 'a[2]=x&a[0]=y&bad=%E0%A4%A', { extended: true }, formHeader],
    ['urlencoded', '__proto__[polluted]=yes&toString=hello&safe=ok', { extended: true }, formHeader],
    ['urlencoded', 'utf8=%26%2310003%3B&a=%E9&b=%26%2310003%3B', { charsetSentinel: true, interpretNumericEntities: true }, formHeader],
  ];
  for (const [kind, body, options, headers] of cases) {
    const old = await exchange(before[kind](options), body, headers);
    const next = await exchange(parser[kind](options), body, headers);
    assert.deepEqual(next, old, kind + ': ' + body);
    assert.equal(next.status, 200);
  }
  assert.equal(Object.prototype.polluted, undefined);
});

test('JSON strictness, malformed syntax and per-request reviver failures', async () => {
  for (const body of ['null', 'true', '1', '"text"', '   ', '{broken']) {
    const result = await exchange(parser.json(), body, jsonHeader);
    assert.equal(result.status, 400); assert.equal(result.result.error.type, 'entity.parse.failed');
  }
  assert.deepEqual((await exchange(parser.json({ strict: false }), 'false', jsonHeader)).result.body, false);
  const req = incoming({ ...jsonHeader, 'content-length': '2' });
  const error = await invoke(parser.json(), req, req => req.end('42'));
  assert.ok(error instanceof SyntaxError); assert.equal(error.body, '42');
});

test('configuration fails at factory construction, including otherwise unused depth', () => {
  for (const factory of [parser.json, parser.raw, parser.text, parser.urlencoded]) {
    for (const options of [false, 1, 'json', []]) assert.throws(() => factory(options), TypeError);
    for (const limit of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => factory({ limit }));
    for (const limit of ['', '100kbjunk', {}, '1e3']) assert.throws(() => factory({ limit }));
    for (const type of ['', [], [null], ['json', 'text/@'], 42, null]) assert.throws(() => factory({ type }), TypeError);
    for (const option of ['inflate', 'verify', 'defaultCharset']) assert.throws(() => factory({ [option]: 1 }), TypeError);
  }
  for (const parameterLimit of [0, -1, NaN, 1.5, '3', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => parser.urlencoded({ parameterLimit }), TypeError);
  }
  for (const depth of [-1, NaN, 1.5, '3', null]) assert.throws(() => parser.urlencoded({ depth }), TypeError);
  for (const option of ['extended', 'charsetSentinel', 'interpretNumericEntities']) assert.throws(() => parser.urlencoded({ [option]: 'false' }), TypeError);
  assert.throws(() => parser.json({ strict: 'false' }), TypeError);
  assert.throws(() => parser.json({ reviver: null }), TypeError);
  assert.throws(() => parser.json({ defaultCharset: 'latin1' }), TypeError);
  assert.throws(() => parser.text({ defaultCharset: 'not-a-charset' }), TypeError);
  assert.throws(() => parser.urlencoded({ defaultCharset: 'utf-16' }), TypeError);
});

test('options and type lists are snapshotted, with each getter read once', async () => {
  const reads = {};
  const values = { limit: '8b', inflate: true, verify: false, defaultCharset: 'UTF-8', type: ['json'], strict: true, reviver: undefined };
  const options = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value]));
  for (const name of Object.keys(values)) Object.defineProperty(options, name, { get() { reads[name] = (reads[name] || 0) + 1; return values[name]; } });
  const middleware = parser.json(options);
  for (const count of Object.values(reads)) assert.equal(count, 1);
  values.type[0] = 'text/plain'; values.limit = 0; values.strict = false;
  assert.equal((await exchange(middleware, '{"a":1}', jsonHeader)).status, 200);
  assert.equal((await exchange(middleware, '{"a":123}', jsonHeader)).status, 413);
  assert.doesNotThrow(() => parser.json(Object.freeze({ type: Object.freeze(['json', '+json']) })));
});

test('form parameter and nesting limits, including values above the 32-bit range', async () => {
  for (const parameterLimit of [2 ** 31, 2 ** 32, Number.MAX_SAFE_INTEGER, Infinity]) {
    const result = await exchange(parser.urlencoded({ extended: true, parameterLimit }), 'a=1&b=2', formHeader);
    assert.equal(result.status, 200); assert.deepEqual(result.result.body, { a: '1', b: '2' });
  }
  assert.equal((await exchange(parser.urlencoded({ parameterLimit: 2 }), 'a=1&b=2', formHeader)).status, 200);
  const extra = await exchange(parser.urlencoded({ parameterLimit: 2 }), 'a=1&b=2&c=3', formHeader);
  assert.equal(extra.status, 413); assert.equal(extra.result.error.type, 'parameters.too.many');
  const nested = await exchange(parser.urlencoded({ extended: true, depth: 1 }), 'a[b][c]=x', formHeader);
  assert.equal(nested.status, 400); assert.equal(nested.result.error.type, 'querystring.parse.rangeError');
});

test('byte limits apply to decoded streams for identity, gzip, deflate and Brotli', async () => {
  for (const [encoding, encode] of [['identity', Buffer.from], ['gzip', zlib.gzipSync], ['deflate', zlib.deflateSync], ['br', zlib.brotliCompressSync]]) {
    const headers = { ...jsonHeader, 'content-encoding': encoding };
    assert.equal((await exchange(parser.json({ limit: 7 }), encode('{"a":1}'), headers)).status, 200);
    const extra = await exchange(parser.json({ limit: 7 }), encode('{"a":10}'), headers);
    assert.equal(extra.status, 413); assert.equal(extra.result.error.type, 'entity.too.large');
    const rejected = await exchange(parser.json({ inflate: false }), encode('{"a":1}'), headers);
    assert.equal(rejected.status, encoding === 'identity' ? 200 : 415);
  }
});

test('Zstandard is supported exactly when the runtime provides it', async () => {
  const available = typeof zlib.zstdCompressSync === 'function' && typeof zlib.createZstdDecompress === 'function';
  const body = available ? zlib.zstdCompressSync(Buffer.from('{}')) : Buffer.from('unsupported');
  const result = await exchange(parser.json(), body, { ...jsonHeader, 'content-encoding': 'zstd' });
  assert.equal(result.status, available ? 200 : 415);
});

test('truncated/corrupt compression and unsupported encodings settle once', async () => {
  const valid = zlib.gzipSync('{"message":"hello"}');
  for (const body of [Buffer.from('not gzip'), valid.subarray(0, valid.length - 5)]) {
    const result = await exchange(parser.json(), body, { ...jsonHeader, 'content-encoding': 'gzip' });
    assert.equal(result.status, 400);
  }
  const unsupported = await exchange(parser.json(), 'abc', { ...jsonHeader, 'content-encoding': 'gzip, br' });
  assert.equal(unsupported.status, 415); assert.equal(unsupported.result.error.type, 'encoding.unsupported');
});

test('charset decoding, BOMs, Unicode JSON and pre-pipe charset rejection', async () => {
  for (const charset of ['utf-8', 'utf-16le', 'utf-16be']) {
    const body = iconv.encode('{"word":"日本"}', charset, { addBOM: true });
    assert.deepEqual((await exchange(parser.json(), body, { 'content-type': 'application/json; charset=' + charset })).result.body, { word: '日本' });
  }
  const text = await exchange(parser.text(), Buffer.from('636166e9', 'hex'), { 'content-type': 'text/plain; charset=iso-8859-1' });
  assert.equal(text.result.body, 'café');
  for (const verify of [false, () => {}]) {
    const req = incoming({ 'content-type': 'text/plain; charset=unknown', 'content-encoding': 'gzip', 'content-length': '3' });
    req.pipe = () => assert.fail('unsupported charset piped input');
    const error = await invoke(parser.text({ verify }), req);
    assert.equal(error.status, 415); assert.equal(error.type, 'charset.unsupported');
  }
});

test('verify receives inflated original bytes before decoding, including raw null charset', async () => {
  for (const kind of ['json', 'raw', 'text', 'urlencoded']) {
    const body = kind === 'json' ? '{"a":1}' : 'a=1';
    const middleware = parser[kind]({ type: '*/*', verify(req, res, buffer, encoding) {
      assert.ok(Buffer.isBuffer(buffer)); assert.equal(buffer.toString(), body);
      assert.equal(encoding, kind === 'raw' ? null : 'utf-8');
    } });
    assert.equal((await exchange(middleware, zlib.gzipSync(body), { ...jsonHeader, 'content-encoding': 'gzip' })).status, 200);
  }
});

test('frozen errors, custom statuses and primitive throws do not break error delivery', async () => {
  const custom = Object.freeze(Object.assign(new Error('custom'), { status: 422, code: 'E_CUSTOM', type: 'custom.failure', detail: 'kept' }));
  for (const thrown of [null, undefined, 'denied', custom, Object.freeze(new SyntaxError('frozen'))]) {
    for (const hook of ['verify', 'reviver']) {
      const req = incoming({ ...jsonHeader, 'content-length': '7' });
      const error = await invoke(parser.json({ [hook]: () => { throw thrown; } }), req, req => req.end('{"a":1}'));
      assert.equal(error.cause, thrown);
      assert.equal(error.status, thrown === custom ? 422 : hook === 'verify' ? 403 : 400);
      assert.equal(error.type, thrown === custom ? 'custom.failure' : hook === 'verify' ? 'entity.verify.failed' : 'entity.parse.failed');
      if (thrown === custom) { assert.equal(error.detail, 'kept'); assert.equal(error.code, 'E_CUSTOM'); }
    }
  }
  assert.deepEqual(Object.keys(custom), ['status', 'code', 'type', 'detail']);
});

test('compressed request abort, error and premature close settle and detach listeners', async () => {
  for (const event of ['aborted', 'error', 'close']) {
    const req = incoming({ ...jsonHeader, 'content-encoding': 'gzip', 'transfer-encoding': 'chunked' });
    let decoded;
    const pipe = req.pipe;
    req.pipe = function (destination) { decoded = destination; return pipe.call(this, destination); };
    const sourceError = new Error('source failed');
    const error = await invoke(parser.json(), req, req => {
      req.write(zlib.gzipSync('{"a":1}').subarray(0, 6));
      if (event !== 'error') req.aborted = true;
      req.emit(event, event === 'error' ? sourceError : undefined);
      if (event === 'error') req.end();
    });
    assert.equal(error.status, 400);
    if (event !== 'error') assert.equal(error.type, 'request.aborted');
    assert.equal(decoded.destroyed, true);
    for (const name of ['aborted', 'error', 'close']) assert.equal(req.listenerCount(name), 0, name);
  }
});

test('real compressed HTTP client disconnect settles the middleware', async () => {
  let resolveResult;
  const completed = new Promise(resolve => { resolveResult = resolve; });
  let resolveOpened;
  const opened = new Promise(resolve => { resolveOpened = resolve; });
  const middleware = parser.json();
  const server = http.createServer((req, res) => {
    middleware(req, res, error => { resolveResult(error); if (!res.destroyed) res.end(); });
    resolveOpened();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let timer;
  try {
    const client = http.request({ host: '127.0.0.1', port: server.address().port, method: 'POST', headers: { ...jsonHeader, 'content-encoding': 'gzip', 'content-length': 1000 } });
    client.on('error', () => {});
    client.write(zlib.gzipSync('{"a":1}').subarray(0, 6));
    await opened; client.destroy();
    const error = await Promise.race([completed, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('aborted HTTP request did not settle')), 1000); })]);
    assert.equal(error.type, 'request.aborted'); assert.equal(error.status, 400);
  } finally { clearTimeout(timer); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('pipe failures roll back decoder and request subscriptions', async () => {
  const req = incoming({ ...jsonHeader, 'content-encoding': 'gzip', 'content-length': '2' });
  let decoder;
  req.pipe = destination => { decoder = destination; throw new Error('pipe failed'); };
  const error = await invoke(parser.json(), req, req => req.end('{}'));
  assert.equal(error.status, 400); assert.equal(error.message, 'pipe failed');
  assert.equal(decoder.destroyed, true);
  for (const name of ['aborted', 'error', 'close']) assert.equal(req.listenerCount(name), 0);
});

test('unmatched/no-body/already-consumed requests skip and preserve existing bodies', async () => {
  for (const headers of [{}, { 'content-length': '3', 'content-type': 'text/plain' }]) {
    const req = incoming(headers); req.body = { existing: true };
    const error = await invoke(parser.json(), req);
    assert.equal(error, undefined); assert.deepEqual(req.body, { existing: true });
  }
  const req = incoming(jsonHeader); req.complete = true; req.body = { done: true }; req.socket.readable = false;
  await invoke(parser.json(), req);
  assert.deepEqual(req.body, { done: true });
});

test('custom type callback errors use next once; exceptions from next propagate', async () => {
  const req = incoming({ ...jsonHeader, 'content-length': '2' });
  const thrown = new Error('type failed');
  const error = await invoke(parser.json({ type() { throw thrown; } }), req);
  assert.equal(error.cause, thrown);
  const skipped = incoming({}); let calls = 0;
  assert.throws(() => parser.json()(skipped, {}, () => { calls++; throw thrown; }), value => value === thrown);
  assert.equal(calls, 1); skipped.destroy();
});

test('default, named and parser subpath exports resolve to identical factories', async () => {
  const esm = await import('../index.js'); assert.equal(esm.default, parser);
  for (const name of ['json', 'raw', 'text', 'urlencoded']) {
    assert.equal(esm[name], parser[name]);
    assert.equal(require('vbody-parser/' + name), parser[name]);
    assert.equal((await import('vbody-parser/' + name)).default, parser[name]);
  }
});
