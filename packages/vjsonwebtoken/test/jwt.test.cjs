'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const jwt = require('..');
const jws = require('../../vjws');
const { keys } = require('../../vjwa/test/helpers.cjs');
const payload = { sub: 'student', aud: 'ventimath', iss: 'test', iat: 100, exp: 200, nbf: 90 };
const options = { clockTimestamp: 150, audience: 'ventimath', issuer: 'test', subject: 'student' };
function raw(payload, header = { alg: 'HS256', typ: 'JWT' }, secret = 'secret') {
  const input = Buffer.from(JSON.stringify(header)).toString('base64url') + '.' + Buffer.from(payload).toString('base64url');
  return input + '.' + crypto.createHmac('sha256', secret).update(input).digest('base64url');
}
const asyncSign = (value, key, opts) => new Promise((resolve, reject) => jwt.sign(value, key, opts, (e, token) => e ? reject(e) : resolve(token)));
for (const algorithm of jws.ALGORITHMS) test(algorithm + ': sign/verify, callbacks, PEM and tampering', async () => {
  const pair = keys[algorithm.startsWith('ES') ? algorithm : 'RSA'];
  const priv = algorithm.startsWith('HS') ? 'secret' : pair.privateKey;
  const pub = algorithm.startsWith('HS') ? 'secret' : pair.publicKey;
  const signed = jwt.sign(payload, priv, { algorithm });
  assert.deepEqual(jwt.verify(signed, pub, { ...options, algorithms: [algorithm] }), payload);
  const callback = await asyncSign(payload, priv, { algorithm });
  assert.deepEqual(jwt.verify(callback, pub, options), payload);
  assert.equal(jws.verify(signed, algorithm, pub), true);
  const wrong = signed.slice(0, -2) + (signed.at(-2) === 'A' ? 'B' : 'A') + signed.at(-1);
  assert.throws(() => jwt.verify(wrong, pub, options), /invalid signature/);
  if (!algorithm.startsWith('HS')) {
    assert.deepEqual(jwt.verify(signed, pair.publicPem, options), payload);
    assert.deepEqual(jwt.verify(signed, Buffer.from(pair.publicPem), options), payload);
    assert.deepEqual(jwt.verify(jwt.sign(payload, pair.privatePem, { algorithm }), pub, options), payload);
  }
});
test('preserves complete results, Unicode and fresh decoded objects', () => {
  const token = jwt.sign({ ...payload, text: '雪 ☃' }, 'secret', { keyid: 'κλειδί' });
  const complete = jwt.verify(token, 'secret', { ...options, complete: true });
  assert.equal(complete.header.kid, 'κλειδί');
  assert.equal(complete.payload.text, '雪 ☃');
  assert.equal(complete.signature, token.split('.')[2]);
  complete.header.alg = 'none'; complete.payload.sub = 'changed';
  assert.equal(jwt.decode(token, { complete: true }).header.alg, 'HS256');
  assert.equal(jwt.verify(token, 'secret', options).sub, 'student');
});
test('zero iat, zero clock and zero maxAge retain their meanings', () => {
  const token = jwt.sign({ iat: 0 }, 'secret', { expiresIn: 10, notBefore: 0 });
  assert.deepEqual(jwt.decode(token), { iat: 0, exp: 10, nbf: 0 });
  assert.deepEqual(jwt.verify(token, 'secret', { clockTimestamp: 0 }), { iat: 0, exp: 10, nbf: 0 });
  assert.throws(() => jwt.verify(token, 'secret', { clockTimestamp: 0, maxAge: 0 }), jwt.TokenExpiredError);
  assert.throws(() => jwt.verify(token, 'secret', { clockTimestamp: 10 }), jwt.TokenExpiredError);
});
for (const name of ['iat', 'exp', 'nbf']) test(name + ': rejects non-finite and non-number claims', async () => {
  for (const value of [NaN, Infinity, -Infinity, undefined, null, '1', new Number(1)]) {
    assert.throws(() => jwt.sign({ [name]: value }, 'secret'), /should be a number/);
    await assert.rejects(asyncSign({ [name]: value }, 'secret'), /should be a number/);
  }
  for (const literal of ['1e400', '-1e400', 'null', '"1"']) {
    assert.throws(() => jwt.verify(raw(`{"${name}":${literal}}`), 'secret', { ignoreExpiration: true, ignoreNotBefore: true }), new RegExp('invalid ' + name));
  }
});
test('validates all time and algorithm options without truthiness bypasses', () => {
  const token = jwt.sign({}, 'secret');
  for (const value of [NaN, Infinity, -Infinity, '', false, null]) {
    for (const name of ['clockTimestamp', 'clockTolerance']) assert.throws(() => jwt.verify(token, 'secret', { [name]: value }), /must be/);
  }
  assert.throws(() => jwt.verify(token, 'secret', { clockTolerance: -1 }), /non-negative/);
  for (const value of ['HS256', [], ['HS256', 'bogus'], null, true]) assert.throws(() => jwt.verify(token, 'secret', { algorithms: value }), /algorithms/);
  for (const value of ['', null, false, NaN, Infinity]) assert.throws(() => jwt.verify(token, 'secret', { maxAge: value }), /maxAge/);
  for (const name of ['expiresIn', 'notBefore']) for (const value of [Infinity, NaN, 0.5, '1e400y']) assert.throws(() => jwt.sign({}, 'secret', { [name]: value }), /timespan/);
});
test('expiration, not-before, maxAge boundaries and error inheritance', () => {
  const token = jwt.sign(payload, 'secret');
  assert.throws(() => jwt.verify(token, 'secret', { clockTimestamp: 89 }), error => error instanceof jwt.NotBeforeError && error instanceof jwt.JsonWebTokenError && error.date.getTime() === 90000);
  assert.equal(jwt.verify(token, 'secret', { clockTimestamp: 89, clockTolerance: 1 }).iat, 100);
  assert.throws(() => jwt.verify(token, 'secret', { clockTimestamp: 200 }), error => error instanceof jwt.TokenExpiredError && error.expiredAt.getTime() === 200000);
  assert.equal(jwt.verify(token, 'secret', { clockTimestamp: 200, clockTolerance: 1 }).iat, 100);
  assert.throws(() => jwt.verify(token, 'secret', { clockTimestamp: 160, maxAge: '1m' }), /maxAge exceeded/);
  assert.equal(jwt.verify(token, 'secret', { clockTimestamp: 159.5, maxAge: 60 }).iat, 100);
  assert.equal(jwt.verify(token, 'secret', { clockTimestamp: 200, ignoreExpiration: true }).iat, 100);
});
test('duration units preserve ms semantics and reject overflow', () => {
  assert.equal(jwt.decode(jwt.sign({ iat: 0 }, 'secret', { expiresIn: '120' })).exp, 0);
  assert.equal(jwt.decode(jwt.sign({ iat: 0 }, 'secret', { expiresIn: '120s' })).exp, 120);
  assert.throws(() => jwt.sign({ iat: 1e308 }, 'secret', { expiresIn: 1e308 }), /timespan/);
});
test('audience RegExp is deterministic, does not coerce claims or mutate lastIndex', () => {
  const pattern = /^venti/g; pattern.lastIndex = 4;
  const token = jwt.sign(payload, 'secret');
  for (let i = 0; i < 5; i++) assert.equal(jwt.verify(token, 'secret', { ...options, audience: pattern }).aud, 'ventimath');
  assert.equal(pattern.lastIndex, 4);
  for (const aud of [123, null, {}]) assert.throws(() => jwt.verify(raw(JSON.stringify({ aud })), 'secret', { audience: /.*/ }), /audience invalid/);
  assert.equal(jwt.verify(raw('{"aud":["other","ventimath"]}'), 'secret', { audience: ['missing', /^venti/y] }).aud[1], 'ventimath');
});
test('enforces empty requested claims and validates issuer options', () => {
  for (const [option, claim] of [['issuer', 'iss'], ['subject', 'sub'], ['jwtid', 'jti']]) {
    const token = jwt.sign({ [claim]: '' }, 'secret');
    assert.equal(jwt.verify(token, 'secret', { [option]: '' })[claim], '');
    assert.throws(() => jwt.verify(jwt.sign({}, 'secret'), 'secret', { [option]: '' }), /invalid/);
  }
  for (const issuer of [true, 4, {}, [], [4], new Array(1)]) assert.throws(() => jwt.verify(jwt.sign({}, 'secret'), 'secret', { issuer }), /issuer must/);
  assert.throws(() => jwt.verify(jwt.sign({}, 'secret'), 'secret', { algorithms: new Array(1) }), /algorithms/);
  assert.throws(() => jwt.sign({}, 'secret', { audience: new Array(1) }), /audience/);
});
test('callbacks complete exactly once on claim conflicts and are deferred for signing', async () => {
  let calls = 0, returned = false;
  await new Promise((resolve, reject) => {
    jwt.sign({ sub: 'present' }, 'secret', { subject: 'conflict', issuer: 'test' }, (error, token) => {
      try { calls++; assert.equal(returned, true); assert.match(error.message, /already has/); assert.equal(token, undefined); resolve(); } catch (e) { reject(e); }
    });
    returned = true;
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
});
test('key resolver gets independent header, snapshots options and completes once', async () => {
  const token = jwt.sign(payload, 'secret', { header: { metadata: { key: 'original' } } });
  const opts = { ...options, complete: true, algorithms: ['HS256'], issuer: ['test'] };
  let calls = 0;
  await new Promise((resolve, reject) => {
    jwt.verify(token, (header, done) => {
      header.alg = 'none'; header.metadata.key = 'changed';
      opts.algorithms[0] = 'none'; opts.issuer[0] = 'changed'; opts.clockTimestamp = 500;
      setImmediate(() => { done(null, 'secret'); done(new Error('second')); });
    }, opts, (error, value) => {
      try { calls++; assert.ifError(error); assert.equal(value.header.alg, 'HS256'); assert.equal(value.header.metadata.key, 'original'); resolve(); } catch (e) { reject(e); }
    });
  });
  assert.equal(calls, 1);
});
test('resolver errors and throws are delivered once; callback throws propagate', () => {
  const token = jwt.sign({}, 'secret');
  for (const resolver of [(_h, done) => { done(new Error('key unavailable')); done(null, 'secret'); }, () => { throw new Error('key unavailable'); }]) {
    let calls = 0;
    jwt.verify(token, resolver, error => { calls++; assert.match(error.message, /key unavailable/); assert.ok(error.inner instanceof Error); });
    assert.equal(calls, 1);
  }
  const sentinel = new Error('user callback');
  assert.throws(() => jwt.verify(token, (_header, done) => done(null, 'secret'), () => { throw sentinel; }), e => e === sentinel);
  assert.throws(() => jwt.verify(token, 'secret', () => { throw sentinel; }), e => e === sentinel);
  assert.throws(() => jwt.verify(token, () => 'secret'), /asynchronous/);
});
test('no unsigned or cross-family downgrade; none requires explicit opt-in', () => {
  const token = jwt.sign({}, null, { algorithm: 'none', noTimestamp: true });
  assert.deepEqual(jwt.verify(token, null, { algorithms: ['none'] }), {});
  assert.throws(() => jwt.verify(token, null), /specify "none"/);
  assert.throws(() => jwt.verify(token, 'secret', { algorithms: ['none'] }), /signature is required/);
  assert.throws(() => jwt.sign({}, 'secret', { algorithm: 'none' }), /null key/);
  assert.throws(() => jwt.sign({}, null, { header: { alg: 'none' } }), /conflicts/);
  assert.throws(() => jwt.sign({}, 'secret', { algorithm: 'HS256', header: { alg: 'HS512' } }), /conflicts/);
  const confused = raw('{}', { alg: 'HS256' }, keys.RSA.publicPem);
  for (const key of [keys.RSA.publicKey, keys.RSA.publicPem, Buffer.from(keys.RSA.publicPem)]) {
    assert.throws(() => jwt.verify(confused, key, { algorithms: ['HS256'] }), /symmetric key/);
    assert.throws(() => jwt.sign({}, key, { algorithm: 'HS256' }), /symmetric key/);
  }
  assert.throws(() => jwt.verify(confused, keys.RSA.publicPem), /invalid algorithm/);
  assert.throws(() => jwt.sign({}, keys.ES384.privateKey, { algorithm: 'ES256' }), /requires curve/);
});
test('key-size guard, explicit small-key opt-in, and metadata shadowing', () => {
  const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
  assert.throws(() => jwt.sign({}, pair.privateKey, { algorithm: 'RS256' }), /2048 bits/);
  assert.ok(jwt.verify(jwt.sign({}, pair.privateKey, { algorithm: 'RS256', allowInsecureKeySizes: true }), pair.publicKey));
  jwt.sign({}, pair.privateKey, { algorithm: 'RS256', allowInsecureKeySizes: true });
  Object.defineProperty(pair.privateKey, 'asymmetricKeyDetails', { value: { modulusLength: 4096 } });
  assert.throws(() => jwt.sign({}, pair.privateKey, { algorithm: 'RS256' }), /valid key material/);
  for (const fn of [() => jwt.sign({}, 'secret', { allowInvalidAsymmetricKeyTypes: true }), () => jwt.verify(jwt.sign({}, 'secret'), 'secret', { allowInvalidAsymmetricKeyTypes: true })]) assert.throws(fn, /not supported/);
});
test('mutable secrets and public PEM buffers are not cached by identity', () => {
  const secret = Buffer.from('first-secret');
  const token = jwt.sign({}, secret);
  assert.ok(jwt.verify(token, secret)); secret.fill(65);
  assert.throws(() => jwt.verify(token, secret), /invalid signature/);
  const pem = Buffer.from(keys.RSA.publicPem);
  const rsa = jwt.sign({}, keys.RSA.privateKey, { algorithm: 'RS256' });
  assert.ok(jwt.verify(rsa, pem)); pem.fill(65);
  assert.throws(() => jwt.verify(rsa, pem), /invalid algorithm/);
});
test('native DER, JWK and encrypted PEM import options retain key validation', () => {
  const pair = keys.RSA;
  const privateKeys = [
    { key: pair.privateKey.export({ format: 'der', type: 'pkcs8' }), format: 'der', type: 'pkcs8' },
    { key: pair.privateKey.export({ format: 'jwk' }), format: 'jwk' },
    { key: pair.privateKey.export({ format: 'pem', type: 'pkcs8', cipher: 'aes-256-cbc', passphrase: 'test-only' }), passphrase: 'test-only' },
  ];
  const publicKeys = [
    { key: pair.publicKey.export({ format: 'der', type: 'spki' }), format: 'der', type: 'spki' },
    { key: pair.publicKey.export({ format: 'jwk' }), format: 'jwk' },
    { key: pair.publicPem },
  ];
  for (const key of privateKeys) {
    const token = jwt.sign(payload, key, { algorithm: 'RS256' });
    for (const key of publicKeys) assert.deepEqual(jwt.verify(token, key, options), payload);
  }
  assert.throws(() => jwt.sign(payload, { ...privateKeys[2], passphrase: 'wrong' }, { algorithm: 'RS256' }), /valid key material/);
  assert.throws(() => jwt.sign({}, '-----BEGIN invalid'), /valid key material/);
});
test('supports genuine secret CryptoKeys, typed byte views and cross-realm plain payloads', async () => {
  const backing = Buffer.from('xsecrety'), secret = new DataView(backing.buffer, backing.byteOffset + 1, 6);
  assert.ok(jwt.verify(jwt.sign({}, secret), 'secret'));
  const key = await crypto.webcrypto.subtle.importKey('raw', Buffer.from('secret'), { name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify']);
  assert.ok(jwt.verify(jwt.sign({}, key), key));
  const hidden = await crypto.webcrypto.subtle.importKey('raw', Buffer.from('secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  assert.throws(() => jwt.sign({}, hidden), /valid key material/);
  assert.equal(jwt.verify(jwt.sign(vm.runInNewContext('({sub:"foreign"})'), 'secret'), 'secret').sub, 'foreign');
});
test('snapshots getters and keeps prototype keys inert', () => {
  let reads = 0;
  const input = { get iat() { return ++reads === 1 ? 0 : Infinity; } };
  assert.equal(jwt.decode(jwt.sign(input, 'secret')).iat, 0); assert.equal(reads, 1);
  const proto = JSON.parse('{"__proto__":{"exp":0},"constructor":"claim","sub":"student"}');
  const output = jwt.verify(jwt.sign(proto, 'secret'), 'secret');
  assert.equal(Object.hasOwn(output, '__proto__'), true);
  assert.equal(Object.getPrototypeOf(output), Object.prototype);
  assert.equal(output.constructor, 'claim');
  assert.throws(() => jwt.sign({}, 'secret', JSON.parse('{"__proto__":{"algorithm":"none"}}')), /not allowed/);
  assert.throws(() => jwt.sign({ toJSON() { return { exp: Infinity }; } }, 'secret'), /toJSON/);
});
test('mutatePayload changes only requested claims; default preserves input', () => {
  const original = { sub: 'student', iat: 0 };
  jwt.sign(original, 'secret', { expiresIn: 10 }); assert.deepEqual(original, { sub: 'student', iat: 0 });
  const token = jwt.sign(original, 'secret', { expiresIn: 10, mutatePayload: true });
  assert.deepEqual(original, jwt.decode(token));
  jwt.sign(original, 'secret', { noTimestamp: true, mutatePayload: true });
  assert.equal(Object.hasOwn(original, 'iat'), false);
});
test('rejects malformed compact encodings, UTF-8, critical headers and invalid payloads', () => {
  const token = jwt.sign(payload, 'secret');
  for (const input of [token + ' ', token + '.', token.replace('.', '=.'), 'a.b.c']) assert.throws(() => jwt.verify(input, 'secret'), jwt.JsonWebTokenError);
  for (const header of [{ alg: 'HS256', b64: false }, { alg: 'HS256', crit: ['custom'] }, { alg: 'HS256', crit: [] }]) assert.throws(() => jwt.verify(raw('{}', header), 'secret'), /invalid token/);
  for (const value of ['null', '[]', 'true', '123']) assert.throws(() => jwt.verify(raw(value), 'secret'), /invalid payload/);
  assert.throws(() => jwt.verify(raw(Buffer.from([0xff])), 'secret'), /UTF-8/);
  assert.throws(() => jwt.verify(raw(Buffer.from('{"text":"\xff"}', 'latin1'), { alg: 'HS256' }), 'secret'), /UTF-8/);
  assert.throws(() => jwt.verify(raw('{'), 'secret'), SyntaxError);
  assert.equal(jwt.decode('a.b.c'), null);
});
test('string/number/byte compatibility; object JSON always uses UTF-8', () => {
  for (const value of ['text', 123, Buffer.from('text'), new Uint8Array(Buffer.from('text'))]) {
    assert.equal(jwt.verify(jwt.sign(value, 'secret'), 'secret'), typeof value === 'number' ? '123' : 'text');
  }
  assert.equal(jwt.verify(jwt.sign({ text: '雪' }, 'secret', { encoding: 'latin1' }), 'secret').text, '雪');
  assert.throws(() => jwt.sign('text', 'secret', { expiresIn: 10 }), /invalid expiresIn/);
});
test('errors retain names, dates, inner causes and stacks', () => {
  const cause = new Error('cause');
  const error = new jwt.JsonWebTokenError('message', cause);
  assert.equal(error.inner, cause); assert.equal(error.name, 'JsonWebTokenError');
  assert.ok(error instanceof Error); assert.match(error.stack, /message/);
  assert.equal(new jwt.NotBeforeError('later', new Date(0)).date.getTime(), 0);
  assert.equal(new jwt.TokenExpiredError('expired', new Date(0)).expiredAt.getTime(), 0);
});
