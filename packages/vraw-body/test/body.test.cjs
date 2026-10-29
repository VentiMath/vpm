'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough, Readable, Writable } = require('node:stream');
const { AsyncLocalStorage, createHook } = require('node:async_hooks');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const body = require('..');
const upstream = require('./upstream.cjs');
const iconv = require('viconv-lite');
const events = ['aborted', 'close', 'data', 'end', 'error'];
const turn = () => new Promise(resolve => setImmediate(resolve));
function clean(stream) { for (const event of events) assert.equal(stream.listenerCount(event), 0, event); }
function outcome(read, chunks, options, callback = false) {
  const stream = new PassThrough();
  const result = callback ? new Promise((resolve, reject) => read(stream, options, (error, value) => error ? reject(error) : resolve(value))) : read(stream, options);
  for (const chunk of chunks) stream.write(chunk);
  stream.end();
  return result;
}

test('pinned upstream fixtures match their recorded hashes', () => {
  const directory = path.join(__dirname, 'fixtures');
  for (const file of require('./fixtures/UPSTREAM.json').files) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(directory, file.fixture))).digest('hex'), file.sha256);
  }
});

test('Buffer and string overloads agree with upstream through promises and callbacks', async () => {
  for (const callback of [false, true]) {
    for (const options of [undefined, null, {}, true, 'utf8', { encoding: false }, { encoding: null }, { length: '0006', limit: '1kb' }]) {
      const chunks = [Buffer.from('hé'), Buffer.from('llo')];
      assert.deepEqual(await outcome(body, chunks, options, callback), await outcome(upstream, chunks, options, callback));
    }
    for (const encoding of ['utf8', 'utf16le', 'utf16be', 'utf32le', 'utf32be', 'windows1252', 'shiftjis', 'base64', 'hex']) {
      const input = Buffer.from('café💩');
      for (let split = 0; split <= input.length; split++) {
        const chunks = [input.subarray(0, split), input.subarray(split)];
        assert.equal(await outcome(body, chunks, encoding, callback), await outcome(upstream, chunks, encoding, callback), encoding);
      }
    }
  }
});

test('empty streams, callback shorthand, and byte lengths match upstream', async () => {
  assert.deepEqual(await body(Readable.from([]), { length: 0, limit: 0 }), Buffer.alloc(0));
  assert.equal(await body(Readable.from([]), true), '');
  await new Promise((resolve, reject) => body(Readable.from([Buffer.from('abc')]), (error, value) => {
    try { assert.ifError(error); assert.deepEqual(value, Buffer.from('abc')); resolve(); } catch (error) { reject(error); }
  }));
  assert.equal(await outcome(body, [Buffer.from('é')], { length: 2, limit: 2, encoding: true }), 'é');
});

test('reads a real file stream', async () => {
  const file = path.join(__dirname, 'fixtures/raw-body-3.0.2.cjs');
  assert.deepEqual(await body(fs.createReadStream(file, { highWaterMark: 13 })), fs.readFileSync(file));
});

test('result Buffer has independent storage even with one chunk', async () => {
  const input = Buffer.from('abc');
  const result = await outcome(body, [input]);
  input[0] = 122;
  assert.equal(result.toString(), 'abc');
  result[1] = 122;
  assert.equal(input.toString(), 'zbc');
});

test('supports byte-array views and cross-realm Uint8Array chunks', async () => {
  const input = vm.runInNewContext('new Uint8Array([99, 97, 98, 99, 99]).subarray(1, 4)');
  assert.deepEqual(await body(Readable.from([input])), Buffer.from('abc'));
});

test('one-chunk copies preserve view bounds and remain independent', async () => {
  for (const input of [Buffer.from('!abc!').subarray(1, 4), new Uint8Array([33, 97, 98, 99, 33]).subarray(1, 4)]) {
    const result = await body(Readable.from([input]));
    assert.equal(result.toString(), 'abc');
    input.fill(0); assert.equal(result.toString(), 'abc');
  }
  assert.deepEqual(await body(Readable.from([Buffer.alloc(0), Buffer.from('ab'), Buffer.alloc(0), Buffer.from('c')])), Buffer.from('abc'));
  assert.deepEqual(await body(Readable.from([Buffer.alloc(0)])), Buffer.alloc(0));
  const customized = Buffer.from('abc');
  customized.valueOf = () => 'different bytes';
  customized[Symbol.toPrimitive] = () => 'different bytes';
  assert.equal((await body(Readable.from([customized]))).toString(), 'abc');
});

test('rejects forged byte buffers through the normal error path', async () => {
  for (const chunk of [Object.create(Buffer.prototype), Object.create(Uint8Array.prototype), { [Symbol.toStringTag]: 'Uint8Array', length: 1, 0: 97 }]) {
    const stream = new PassThrough(); const result = body(stream);
    assert.doesNotThrow(() => stream.emit('data', chunk));
    await assert.rejects(result, { status: 500, type: 'stream.chunk.invalid' });
    clean(stream); stream.destroy();
  }
});

test('retains BOM stripping and corrected VPM decoder chunk boundaries', async () => {
  for (const [encoding, hex, expected] of [
    ['utf8', 'efbbbf61', 'a'], ['utf16', 'feff0061', 'a'], ['utf32', '0000feff00000061', 'a'],
    ['gb18030', '9439da33', '💩'], ['big5hkscs', '8862', 'Ê̄'], ['utf7', '2b4141412d', '\0'],
  ]) {
    const input = Buffer.from(hex, 'hex');
    for (let split = 0; split <= input.length; split++) {
      assert.equal(await outcome(body, [input.subarray(0, split), input.subarray(split)], encoding), expected, encoding + ':' + split);
    }
  }
});

test('rejects invalid arguments before attaching listeners or starting flow', () => {
  for (const stream of [undefined, null, 1, '', {}, { on() {} }]) assert.throws(() => body(stream), TypeError);
  for (const options of [false, 1, [], { encoding: 1 }, { encoding: '' }, { encoding: {} }]) {
    const stream = new PassThrough();
    assert.throws(() => body(stream, options), TypeError);
    clean(stream); assert.equal(stream.readableFlowing, null);
  }
  assert.throws(() => body(new PassThrough(), {}, null), TypeError);
});

test('rejects malformed length and limit values in both APIs before reading', () => {
  const invalid = {
    length: ['', ' 2', '2 ', '-1', '1.5', '1e3', '0x10', '2junk', -1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '9007199254740992', {}, true],
    limit: ['', '1e3', '1kbjunk', -1, NaN, '8pb', {}, true],
  };
  for (const [key, values] of Object.entries(invalid)) for (const value of values) {
    const stream = new PassThrough();
    for (const callback of [undefined, () => assert.fail('invalid options called back')]) {
      assert.throws(() => body(stream, { [key]: value }, callback), error => error instanceof TypeError || error instanceof RangeError, key + ':' + String(value));
    }
    clean(stream); assert.equal(stream.readableFlowing, null);
  }
});

test('snapshots options, reads each value once, and accepts frozen options', async () => {
  const reads = {};
  const options = Object.fromEntries(['limit', 'length', 'encoding'].map(key => [key, key === 'encoding' ? true : 3]));
  const stream = new PassThrough();
  const result = body(stream, new Proxy(options, { get(target, key) { reads[key] = (reads[key] || 0) + 1; return target[key]; } }));
  options.encoding = false; options.limit = 0; options.length = 0;
  stream.end('abc'); assert.equal(await result, 'abc');
  assert.deepEqual(reads, { limit: 1, length: 1, encoding: 1 });
  assert.equal(await outcome(body, [Buffer.from('abc')], Object.freeze({ encoding: true })), 'abc');
});

test('oversized declared length is rejected asynchronously without consuming data', async () => {
  const stream = new PassThrough();
  let synchronous = true;
  const result = new Promise(resolve => body(stream, { length: 3, limit: 2 }, (error, value) => {
    assert.equal(synchronous, false); assert.equal(value, undefined);
    assert.equal(error.status, 413); assert.equal(error.type, 'entity.too.large');
    assert.equal(error.expected, 3); assert.equal(error.length, 3); assert.equal(error.limit, 2); resolve();
  }));
  synchronous = false; await result; clean(stream);
  assert.equal(stream.readableFlowing, false); assert.equal(stream.destroyed, false);
});

test('streamed limits count bytes and report the offending chunk total', async () => {
  const stream = new PassThrough();
  const result = body(stream, { encoding: true, limit: 3 });
  stream.write('é'); stream.write('é');
  await assert.rejects(result, { status: 413, statusCode: 413, type: 'entity.too.large', limit: 3, received: 4 });
  clean(stream); assert.equal(stream.isPaused(), true); stream.destroy();
});

test('length mismatch reports metadata for both undersized and oversized streams', async () => {
  for (const size of [2, 4]) {
    await assert.rejects(outcome(body, [Buffer.alloc(size)], { length: '3' }), {
      status: 400, type: 'request.size.invalid', expected: 3, length: 3, received: size,
    });
  }
});

test('excess declared length fails before end and before decoding the excess', async () => {
  const stream = new PassThrough();
  const result = body(stream, { length: 0 });
  stream.write('x');
  await assert.rejects(result, { type: 'request.size.invalid', received: 1 });
  clean(stream); assert.equal(stream.writableEnded, false); stream.destroy();
});

test('combined bounds preserve zero limits, length failures, and 413 precedence', async () => {
  for (const length of [null, 0, 1, 2, 3, 4, 8]) for (const limit of [null, 0, 1, 2, 3, 4, 8]) {
    let expected;
    if (length !== null && limit !== null && length > limit) {
      expected = { type: 'entity.too.large', status: 413, expected: length, length, limit };
    } else {
      for (const received of [2, 4]) {
        if (limit !== null && received > limit) { expected = { type: 'entity.too.large', status: 413, limit, received }; break; }
        if (length !== null && received > length) { expected = { type: 'request.size.invalid', status: 400, expected: length, length, received }; break; }
      }
      if (!expected && length !== null && length !== 4) expected = { type: 'request.size.invalid', status: 400, expected: length, length, received: 4 };
    }
    for (const encoding of [false, true]) {
      const result = outcome(body, [Buffer.from('ab'), Buffer.from('cd')], { length, limit, encoding });
      if (expected) await assert.rejects(result, expected);
      else assert.deepEqual(await result, encoding ? 'abcd' : Buffer.from('abcd'));
    }
  }
});

test('preserves unsupported encoding and already encoded stream errors', async () => {
  const stream = new PassThrough(); stream.setEncoding('utf8');
  await assert.rejects(body(stream), { status: 500, type: 'stream.encoding.set' }); clean(stream);
  const other = new PassThrough();
  await assert.rejects(body(other, 'not-an-encoding'), { status: 415, type: 'encoding.unsupported', encoding: 'not-an-encoding' }); clean(other);
});

test('already destroyed, ended, closed, and aborted streams settle', async () => {
  const destroyed = new PassThrough(); destroyed.destroy();
  await assert.rejects(body(destroyed), { type: 'stream.not.readable' });
  const ended = Readable.from([]); ended.resume(); await new Promise(resolve => ended.on('end', resolve));
  await assert.rejects(body(ended), { type: 'stream.not.readable' });
  const aborted = new PassThrough(); aborted.aborted = true;
  await assert.rejects(body(aborted), { type: 'request.aborted', received: 0 });
});

test('premature close settles instead of silently leaving the read pending', async () => {
  const previous = new PassThrough(); let upstreamCalled = false;
  upstream(previous, () => { upstreamCalled = true; }); previous.destroy();
  await turn(); assert.equal(upstreamCalled, false); clean(previous);
  const stream = new PassThrough();
  const result = body(stream, { length: 5 }); stream.write('ab'); stream.destroy();
  await assert.rejects(result, { status: 400, code: 'ECONNABORTED', type: 'request.aborted', expected: 5, length: 5, received: 2 });
  clean(stream);
});

test('abort, end and close races settle exactly once and remove only owned listeners', async () => {
  const stream = new PassThrough(); const observer = () => {};
  stream.on('close', observer); let calls = 0;
  body(stream, (error) => { calls++; assert.equal(error.type, 'request.aborted'); });
  stream.emit('aborted'); stream.emit('close'); stream.emit('end');
  await turn(); assert.equal(calls, 1);
  assert.deepEqual(stream.listeners('close'), [observer]); stream.removeListener('close', observer); clean(stream);
});

test('source errors retain identity; failure unpipes and pauses without destroying', async () => {
  const stream = new PassThrough(); const destination = new Writable({ write(_chunk, _encoding, done) { done(); } });
  let unpiped = 0; destination.on('unpipe', () => { unpiped++; }); stream.pipe(destination);
  const failure = new Error('source failure'); const result = body(stream);
  stream.emit('error', failure);
  await assert.rejects(result, error => error === failure);
  assert.equal(unpiped, 1); assert.equal(stream.isPaused(), true); assert.equal(stream.destroyed, false); clean(stream);
  stream.destroy(); destination.destroy();
});

test('non-byte chunks and mid-read setEncoding become controlled errors', async () => {
  for (const chunk of ['é', {}, 1, new Uint16Array([1])]) {
    const stream = new PassThrough({ objectMode: true }); const result = body(stream);
    stream.write(chunk);
    await assert.rejects(result, { status: 500, type: typeof chunk === 'string' ? 'stream.encoding.set' : 'stream.chunk.invalid' });
    clean(stream); stream.destroy();
  }
  const stream = new PassThrough(); const result = body(stream); stream.setEncoding('utf8'); stream.write('abc');
  await assert.rejects(result, { type: 'stream.encoding.set' }); clean(stream); stream.destroy();
});

test('decoder write/end exceptions settle and clean up without escaping event dispatch', async () => {
  const saved = iconv.getDecoder;
  try {
    for (const method of ['write', 'end']) {
      const failure = new Error('decoder ' + method);
      iconv.getDecoder = () => ({ write: () => '', end: () => '', [method]() { throw failure; } });
      const stream = new PassThrough(); const result = body(stream, true);
      stream.end('abc'); await assert.rejects(result, error => error === failure); clean(stream);
    }
  } finally { iconv.getDecoder = saved; }
});

test('callback keeps registration async context and releases its resource', async () => {
  const storage = new AsyncLocalStorage(); const stream = new PassThrough();
  const result = new Promise((resolve, reject) => storage.run('request', () => body(stream, function (error, value) {
    try { assert.ifError(error); assert.equal(this, null); assert.equal(storage.getStore(), 'request'); assert.equal(value.toString(), 'abc'); resolve(); }
    catch (error) { reject(error); }
  })));
  storage.run('producer', () => stream.end('abc'));
  await result; clean(stream);
});

test('async resource destruction occurs even if the callback throws', { skip: !!process.versions.bun }, async () => {
  const resources = new Set(); const destroyed = new Set();
  const hook = createHook({ init(id, type) { if (type === 'vraw-body') resources.add(id); }, destroy(id) { destroyed.add(id); } }).enable();
  try {
    const stream = new PassThrough(); const failure = new Error('callback failure');
    body(stream, () => { throw failure; });
    assert.throws(() => stream.emit('end'), error => error === failure);
    clean(stream); await turn();
    assert.equal(resources.size, 1); for (const id of resources) assert.ok(destroyed.has(id));
  } finally { hook.disable(); }
});

test('reentrant listener registration does not leak listeners or call back synchronously', async () => {
  const stream = new PassThrough(); let synchronous = true;
  stream.on('newListener', event => { if (event === 'data') stream.emit('aborted'); });
  const result = new Promise(resolve => body(stream, error => {
    assert.equal(synchronous, false); assert.equal(error.type, 'request.aborted'); clean(stream); resolve();
  }));
  synchronous = false; await result;
});

test('listener registration failure rolls back earlier registrations', async () => {
  const stream = new PassThrough(); const failure = new Error('registration failed');
  stream.on('newListener', event => { if (event === 'data') throw failure; });
  await assert.rejects(body(stream), error => error === failure); clean(stream);
});

test('unreachable numeric limits mean no limit and fractions floor, as raw-body compares them', async () => {
  const chunks = [Buffer.from('payload')];
  for (const limit of [Infinity, 1e20, Number.MAX_SAFE_INTEGER, 7.5, 7]) {
    assert.deepEqual(await outcome(body, chunks, { limit }), await outcome(upstream, chunks, { limit }), String(limit));
  }
  for (const limit of [6.5, 0]) {
    await assert.rejects(outcome(body, chunks, { limit }), { status: 413, type: 'entity.too.large' });
    await assert.rejects(outcome(upstream, chunks, { limit }), { status: 413, type: 'entity.too.large' });
  }
  for (const limit of [NaN, -1]) assert.throws(() => body(new PassThrough(), { limit }), RangeError);
});
