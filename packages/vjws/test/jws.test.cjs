'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Readable, PassThrough } = require('node:stream');
const { once } = require('node:events');
const jws = require('..');
const jwa = require('../../vjwa');
const { upstream, keys } = require('./helpers.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
const b64 = value => Buffer.from(value).toString('base64url');
const raw = (header, payload, algorithm = 'HS256', key = 'secret') => {
  const input = b64(typeof header === 'string' ? header : JSON.stringify(header)) + '.' + b64(payload);
  return input + '.' + jwa(algorithm).sign(input, key);
};
const waitDone = stream => once(stream, 'done');

for (const algorithm of jws.ALGORITHMS) {
  const family = algorithm.slice(0, 2), key = keys[family === 'ES' ? algorithm : 'RSA'];
  const signing = family === 'HS' ? 'secret' : key.privateKey;
  const verifying = family === 'HS' ? signing : key.publicKey;
  test(algorithm + ': bidirectional compatibility and tampering', () => {
    for (const payload of ['text 雪', '', { sub: 'student', nested: [1, null, true] }, 42, false, null]) {
      const options = { header: { alg: algorithm, kid: 'test' }, payload, privateKey: signing };
      const a = upstream.sign(options), b = jws.sign(options);
      assert.equal(jws.verify(a, algorithm, verifying), true);
      assert.equal(upstream.verify(b, algorithm, verifying), true);
      if (family === 'HS' || family === 'RS') assert.equal(a, b);
      assert.deepEqual(jws.decode(a).header, options.header);
      const parts = b.split('.'); parts[1] = b64('changed');
      assert.equal(jws.verify(parts.join('.'), algorithm, verifying), false);
    }
  });
  test(algorithm + ': streaming sign and verify, using real streams', async () => {
    const expected = 'one, two, three 雪';
    const signer = jws.createSign({ header: { alg: algorithm }, payload: Readable.from(['one, ', 'two, ', 'three 雪']), key: signing });
    const verifier = jws.createVerify({ algorithm, signature: signer, key: verifying });
    const [[valid, decoded], [token]] = await Promise.all([waitDone(verifier), waitDone(signer)]);
    assert.equal(valid, true); assert.equal(decoded.payload, expected);
    assert.equal(upstream.verify(token, algorithm, verifying), true);
  });
}

test('raw Buffer/ArrayBuffer/view payloads preserve every byte and offset', () => {
  const binary = Buffer.from([0, 255, 128, 1, 195, 169]);
  const backing = Buffer.concat([Buffer.from('prefix'), binary, Buffer.from('suffix')]);
  for (const payload of [binary, new DataView(backing.buffer, backing.byteOffset + 6, binary.length),
    new Uint8Array(backing.buffer, backing.byteOffset + 6, binary.length), Uint8Array.from(binary).buffer]) {
    const token = jws.sign({ header: { alg: 'HS256' }, payload, secret: 'secret' });
    assert.deepEqual(Buffer.from(token.split('.')[1], 'base64url'), binary);
    assert.equal(jws.decode(token, { encoding: 'hex' }).payload, binary.toString('hex'));
    assert.equal(jws.verify(token, 'HS256', 'secret'), true);
  }
});

test('UTF-8 headers preserve non-ASCII characters and reject invalid UTF-8', () => {
  const header = { alg: 'HS256', kid: 'José 雪 😀' };
  const token = jws.sign({ header, payload: 'x', secret: 'secret' });
  assert.deepEqual(jws.decode(token).header, header);
  assert.equal(jws.verify(token, 'HS256', 'secret'), true);
  const bad = Buffer.concat([Buffer.from('{"alg":"HS256","kid":"'), Buffer.from([0xff]), Buffer.from('"}')]);
  const input = bad.toString('base64url') + '.eA';
  const malformed = input + '.' + jwa('HS256').sign(input, 'secret');
  assert.equal(jws.decode(malformed), null);
  assert.equal(jws.verify(malformed, 'HS256', 'secret'), false);
});

test('exactly three segments and canonical encodings, even with a matching signature', () => {
  const valid = jws.sign({ header: { alg: 'HS256' }, payload: 'x', secret: 'secret' });
  assert.equal(upstream.verify(valid + '.ignored', 'HS256', 'secret'), true);
  for (const token of [valid + '.ignored', valid + '.', valid + '\n', valid + '\r\n', ' ' + valid,
    valid.replace('.', '..'), '', 'a.b', 'a.b.c', '.eA.AA']) {
    assert.equal(jws.isValid(token), false); assert.equal(jws.decode(token), null);
    assert.equal(jws.verify(token, 'HS256', 'secret'), false);
  }
  const original = valid.split('.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  for (let part = 0; part < 3; part++) {
    const altered = original.slice();
    for (const suffix of ['=', '\n', '!', '\u0100']) {
      altered[part] = original[part] + suffix;
      if (part < 2) altered[2] = jwa('HS256').sign(altered[0] + '.' + altered[1], 'secret');
      assert.equal(jws.verify(altered.join('.'), 'HS256', 'secret'), false);
    }
    if (original[part].length % 4) {
      altered[part] = original[part].slice(0, -1) + alphabet[alphabet.indexOf(original[part].at(-1)) | 1];
      if (part < 2) altered[2] = jwa('HS256').sign(altered[0] + '.' + altered[1], 'secret');
      assert.equal(jws.isValid(altered.join('.')), false);
    }
  }
});

test('empty payloads and empty HMAC secrets work synchronously and in streams', async () => {
  for (const secret of ['', Buffer.alloc(0)]) {
    const token = jws.sign({ header: { alg: 'HS256' }, payload: '', secret });
    assert.equal(jws.isValid(token), true); assert.equal(jws.decode(token).payload, '');
    assert.equal(jws.verify(token, 'HS256', secret), true);
    const stream = jws.createSign({ header: { alg: 'HS256' }, payload: '', secret });
    assert.equal((await waitDone(stream))[0], token);
    assert.equal((await waitDone(jws.createVerify({ algorithm: 'HS256', signature: token, secret })))[0], true);
  }
});

test('large payload validation rejects aliases even when their signatures match', () => {
  for (const size of [3071, 3072, 3073, 65536]) {
    const parts = jws.sign({ header: { alg: 'HS256' }, payload: Buffer.alloc(size, 255), secret: 'secret' }).split('.');
    for (const encoded of [parts[1] + '=', parts[1] + '\n', parts[1].replace('_', '/'),
      parts[1].slice(0, 2000) + '!' + parts[1].slice(2001)]) {
      const input = parts[0] + '.' + encoded;
      const token = input + '.' + jwa('HS256').sign(input, 'secret');
      assert.equal(jws.verify(token, 'HS256', 'secret'), false);
      assert.equal(jws.decode(token), null);
    }
    assert.equal(jws.verify(parts.join('.'), 'HS256', 'secret'), true);
  }
});

test('verification requires a trusted explicit algorithm matching the signed header', () => {
  const token = raw({ alg: 'HS512' }, 'x', 'HS256');
  assert.equal(upstream.verify(token, 'HS256', 'secret'), true);
  assert.equal(jws.verify(token, 'HS256', 'secret'), false);
  assert.throws(() => jws.verify(token), { code: 'MISSING_ALGORITHM' });
  for (const algorithm of ['hs256', 'HS256\n', '__proto__', 'constructor', 'EdDSA', {}, 2]) {
    assert.throws(() => jws.verify(token, algorithm, 'secret'), TypeError);
  }
});

test('none is explicit and never accepts a signature or an algorithm mismatch', () => {
  const token = jws.sign({ header: { alg: 'none' }, payload: '' });
  assert.equal(token.split('.')[2], ''); assert.equal(jws.verify(token, 'none'), true);
  assert.equal(jws.verify(token + 'AA', 'none'), false);
  assert.equal(jws.verify(token, 'HS256', 'secret'), false);
  assert.equal(jws.decode(token).payload, '');
});

test('headers must be objects with their own algorithm and supported critical semantics', () => {
  for (const header of [null, [], 3, 'x', {}, { alg: 1 }, { alg: '' }, { alg: 'HS256', b64: false },
    { alg: 'HS256', b64: 'true' }, { alg: 'HS256', crit: [] }, { alg: 'HS256', crit: ['x'], x: 1 },
    { alg: 'HS256', crit: ['b64'] }, { alg: 'HS256', crit: ['b64', 'b64'], b64: true }]) {
    assert.throws(() => jws.sign({ header, payload: '', secret: 'secret' }), TypeError);
    assert.equal(jws.decode(raw(header, 'x')), null);
  }
  const supported = { alg: 'HS256', b64: true, crit: ['b64'], custom: { x: 1 } };
  assert.deepEqual(jws.decode(jws.sign({ header: supported, payload: 'x', secret: 'secret' })).header, supported);
  assert.throws(() => jws.sign({ header: Object.create({ alg: 'HS256' }), payload: '', secret: 'secret' }), TypeError);
  assert.deepEqual(jws.decode(raw('{"alg":"HS512","alg":"HS256"}', 'x')).header, { alg: 'HS256' });
});

test('header serialization and input getters are evaluated once; exact serialized alg controls signing', () => {
  let reads = 0, serializations = 0, payloadReads = 0;
  const header = { get alg() { return ++reads === 1 ? 'HS256' : 'HS512'; }, kid: 'x' };
  const payload = { toJSON() { serializations++; return { sub: 'student' }; } };
  const token = jws.sign({ header, get payload() { payloadReads++; return payload; }, secret: 'secret' });
  assert.equal(reads, 1); assert.equal(serializations, 1); assert.equal(payloadReads, 1);
  assert.equal(jws.verify(token, 'HS256', 'secret'), true);
  const changed = { alg: 'HS512', toJSON() { return { alg: 'HS256' }; } };
  assert.equal(jws.verify(jws.sign({ header: changed, payload: '', secret: 'secret' }), 'HS256', 'secret'), true);
  for (const header of [{ toJSON: () => 'text' }, { toJSON: () => undefined }]) assert.throws(() => jws.sign({ header, payload: '', secret: 'secret' }), TypeError);
});

test('JSON payload decoding, encoding options, and untrusted decoded results', () => {
  const token = jws.sign({ header: { alg: 'HS256', typ: 'JWT' }, payload: { text: '雪' }, secret: 'secret' });
  assert.deepEqual(jws.decode(token).payload, { text: '雪' });
  const invalid = raw({ alg: 'HS256', typ: 'JWT' }, 'not json');
  assert.throws(() => jws.decode(invalid), SyntaxError);
  assert.equal(jws.verify(invalid, 'HS256', 'secret'), true, 'JWS verifies bytes, not JWT claims');
  const badUtf8 = jws.sign({ header: { alg: 'HS256', typ: 'JWT' }, payload: Buffer.from([34, 255, 34]), secret: 'secret' });
  assert.throws(() => jws.decode(badUtf8), SyntaxError);
  const binary = jws.sign({ header: { alg: 'HS256' }, payload: 'é', encoding: 'latin1', secret: 'secret' });
  assert.equal(jws.decode(binary, { encoding: 'latin1' }).payload, 'é');
  const decoded = jws.decode(token); decoded.header.alg = 'none'; decoded.payload.text = 'changed';
  assert.equal(jws.verify(token, 'HS256', 'secret'), true); assert.equal(jws.decode(token).payload.text, '雪');
  const tampered = token.slice(0, -2) + 'AA';
  assert.equal(jws.isValid(tampered), true); assert.deepEqual(jws.decode(tampered).payload, { text: '雪' });
  assert.equal(jws.verify(tampered, 'HS256', 'secret'), false);
});

test('byte token inputs use the exact view; unsupported token types return null/false', () => {
  const token = raw({ alg: 'HS256' }, 'x'); const backing = Buffer.from('x' + token + 'y');
  for (const input of [Buffer.from(token), new DataView(backing.buffer, backing.byteOffset + 1, token.length)]) {
    assert.equal(jws.verify(input, 'HS256', 'secret'), true); assert.equal(jws.decode(input).payload, 'x');
  }
  for (const input of [undefined, null, {}, ['x'], 1, false]) {
    assert.equal(jws.decode(input), null); assert.equal(jws.isValid(input), false); assert.equal(jws.verify(input, 'HS256', 'secret'), false);
  }
});

test('native keys, encrypted options and genuine CryptoKeys pass through vjwa', async () => {
  const encrypted = keys.RSA.privateKey.export({ format: 'pem', type: 'pkcs8', cipher: 'aes-256-cbc', passphrase: 'test-only' });
  const options = Object.freeze({ key: encrypted, passphrase: 'test-only' });
  const token = jws.sign({ header: { alg: 'RS256' }, payload: 'x', privateKey: options });
  assert.equal(jws.verify(token, 'RS256', keys.RSA.publicKey), true);
  assert.throws(() => jws.verify(token, 'RS256', 'invalid key'));
  const key = await crypto.webcrypto.subtle.importKey('raw', Buffer.from('secret'), { name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify']);
  const signed = jws.sign({ header: { alg: 'HS256' }, payload: 'x', key });
  assert.equal(jws.verify(signed, 'HS256', key), true);
});

test('stream collection preserves chunk bytes, writes, and delayed keys without premature signing', async () => {
  const stream = jws.createSign({ header: { alg: 'HS256' } });
  const promise = waitDone(stream); let count = 0; stream.on('done', () => count++);
  const chunk = Buffer.from([255, 0, 128]); stream.payload.write(chunk); chunk.fill(1);
  assert.equal(stream.sign(), undefined);
  stream.payload.end('tail'); assert.equal(stream.sign(), undefined);
  stream.key.end('secret'); const [token] = await promise;
  assert.deepEqual(Buffer.from(token.split('.')[1], 'base64url'), Buffer.from([255, 0, 128, 116, 97, 105, 108]));
  assert.equal(stream.sign(), token); await tick(); assert.equal(count, 1);
});

test('stream source errors and premature closes propagate once and detach listeners', async () => {
  for (const kind of ['error', 'close']) {
    const source = new PassThrough(); const stream = jws.createSign({ header: { alg: 'HS256' }, secret: 'secret', payload: source });
    let done = 0, errors = 0; stream.on('done', () => done++); stream.on('error', () => errors++);
    const errorEvent = once(stream, 'error');
    await tick(); if (kind === 'error') source.destroy(new Error('source failed')); else source.destroy();
    const [error] = await errorEvent; assert.match(error.message, kind === 'error' ? /source failed/ : /closed before/);
    await tick(); assert.equal(done, 0); assert.equal(errors, 1); assert.equal(source.listenerCount('data'), 0);
    assert.equal(source.listenerCount('error'), 0); assert.equal(stream.payload.destroyed, true);
  }
});

test('already-scheduled source errors are observed before piping starts', async () => {
  const source = new PassThrough(); process.nextTick(() => source.destroy(new Error('early error')));
  const stream = jws.createSign({ header: { alg: 'HS256' }, secret: 'secret', payload: source });
  assert.match((await once(stream, 'error'))[0].message, /early error/);
});

test('legacy upstream signer output can be verified and detached', async () => {
  const signer = upstream.createSign({ header: { alg: 'HS256' }, payload: 'legacy', secret: 'secret' });
  const verifier = jws.createVerify({ algorithm: 'HS256', signature: signer, secret: 'secret' });
  const [valid, decoded] = await waitDone(verifier);
  assert.equal(valid, true); assert.equal(decoded.payload, 'legacy');
  assert.equal(signer.listenerCount('data'), 0); assert.equal(signer.listenerCount('error'), 0);
});

test('cancellation absorbs already queued input errors and no-close destroyed inputs settle', async () => {
  const source = new PassThrough();
  const signer = jws.createSign({ header: { alg: 'HS256' }, payload: source, secret: 'secret' });
  source.destroy(new Error('queued')); signer.destroy(); await tick();
  assert.equal(source.listenerCount('error'), 0);
  const closed = new PassThrough({ emitClose: false }); closed.destroy();
  const operation = jws.createSign({ header: { alg: 'HS256' }, payload: closed, secret: 'secret' });
  assert.equal((await once(operation, 'error'))[0].code, 'ERR_STREAM_PREMATURE_CLOSE');
});

test('stream limits and invalid chunks reject cleanly without successful output', async () => {
  for (const options of [{ payload: Readable.from([Buffer.alloc(5)]), maxBuffer: 4 },
    { payload: Readable.from([{ bad: true }]), maxBuffer: 4 }]) {
    const stream = jws.createSign({ header: { alg: 'HS256' }, secret: 'secret', ...options });
    let done = false; stream.on('done', () => { done = true; });
    const [error] = await once(stream, 'error'); assert.ok(error instanceof Error); assert.equal(done, false);
  }
  for (const maxBuffer of [-1, 1.5, Infinity, '4']) assert.throws(() => jws.createSign({ header: { alg: 'HS256' }, maxBuffer }), RangeError);
  const source = new PassThrough(); const stream = jws.createSign({ header: { alg: 'HS256' }, payload: source, secret: 'secret' });
  const closed = once(stream, 'close'); stream.destroy(); await closed;
  assert.equal(source.destroyed, false); assert.equal(source.listenerCount('data'), 0); assert.equal(source.listenerCount('error'), 0);
});

test('stream verification distinguishes malformed input from invalid-key errors', async () => {
  const malformed = jws.createVerify({ algorithm: 'RS256', signature: 'a.b.c', key: 'invalid key' });
  assert.deepEqual(await waitDone(malformed), [false, null]);
  const signed = jws.sign({ header: { alg: 'RS256' }, payload: 'x', key: keys.RSA.privateKey });
  assert.ok((await once(jws.createVerify({ algorithm: 'RS256', signature: signed, key: 'invalid key' }), 'error'))[0] instanceof Error);
});

test('streams expose standard readable output and finish once under reentrant calls', async () => {
  const signer = jws.createSign({ header: { alg: 'HS256' }, payload: 'x', secret: 'secret' });
  let count = 0; signer.on('done', token => { count++; assert.equal(signer.sign(), token); });
  const chunks = []; for await (const chunk of signer) chunks.push(chunk);
  assert.equal(chunks.length, 1); assert.equal(count, 1);
  const verifier = jws.createVerify({ algorithm: 'HS256', signature: chunks[0], secret: 'secret' });
  const output = []; for await (const chunk of verifier) output.push(chunk);
  assert.deepEqual(output, [true]);
});

test('direct stream inputs preserve public aliases and reject late writes before signing', async () => {
  const signer = jws.createSign({ header: { alg: 'HS256' }, payload: 'x', secret: 'secret' });
  assert.equal(signer.key, signer.secret); assert.equal(signer.key, signer.privateKey);
  assert.equal(signer.payload.buffer, 'x');
  assert.equal(jws.verify((await waitDone(signer))[0], 'HS256', 'secret'), true);
  for (const name of ['payload', 'key']) {
    const operation = jws.createSign({ header: { alg: 'HS256' }, payload: 'x', secret: 'secret' });
    let done = false; operation.on('done', () => { done = true; });
    const errorEvent = once(operation, 'error');
    operation[name].write('too late');
    assert.equal(operation.sign(), undefined);
    assert.match((await errorEvent)[0].message, /already complete/);
    assert.equal(done, false);
  }
});

test('CJS/ESM exports, one VPM dependency and pinned upstream provenance', async () => {
  const imported = await import('../index.js'); assert.equal(imported.default, jws); assert.equal(imported.sign, jws.sign);
  assert.deepEqual(require('../package.json').dependencies, { vjwa: 'workspace:*' });
  for (const [file, hash] of Object.entries(require('../PROVENANCE.json').sha256)) assert.equal(
    crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', file))).digest('hex'), hash, file);
});
