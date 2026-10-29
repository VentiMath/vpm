'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const jwa = require('..');
const { upstream, keys } = require('./helpers.cjs');
const message = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiLpm6oifQ';
const algorithms = ['HS', 'RS', 'PS', 'ES'].flatMap(f => [256, 384, 512].map(n => f + n));

for (const algorithm of algorithms) {
  test(algorithm + ': bidirectional upstream compatibility, tampering and input coercion', () => {
    const key = algorithm.startsWith('HS') ? null : keys[algorithm.startsWith('ES') ? algorithm : 'RSA'];
    const signing = key?.privateKey || 'interoperability-secret';
    const verifying = key?.publicKey || signing;
    const original = upstream(algorithm), current = jwa(algorithm);
    for (const value of [message, '', Buffer.from([0, 255, 65, 0]), { sub: '雪', nested: [1, true, null] }, 42, null]) {
      const a = original.sign(value, signing), b = current.sign(value, signing);
      assert.equal(current.verify(value, a, verifying), true);
      assert.equal(original.verify(value, b, verifying), true);
      if (/^(HS|RS)/.test(algorithm)) assert.equal(b, a);
      assert.equal(current.verify('tampered', a, verifying), false);
      const changed = (a[0] === 'A' ? 'B' : 'A') + a.slice(1);
      assert.equal(current.verify(value, changed, verifying), false);
    }
  });
  test(algorithm + ': canonical signature encoding and exact lengths', () => {
    const key = algorithm.startsWith('HS') ? null : keys[algorithm.startsWith('ES') ? algorithm : 'RSA'];
    const signing = key?.privateKey || 'key', verifying = key?.publicKey || signing;
    const current = jwa(algorithm), original = current.sign(message, signing);
    for (const signature of ['', original + '=', original + '\n', '\t' + original, original + '!',
      original.slice(0, -1) + '\n', original.slice(0, -1) + '\r', original.slice(0, -2) + '\r\n',
      original.slice(0, -1), original + 'AAAA', 'A', '雪', 'A'.repeat(20000),
      original.replace(/-/g, '+').replace(/_/g, '/')]) {
      if (signature !== original) assert.equal(current.verify(message, signature, verifying), false, signature.slice(0, 20));
    }
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    if (original.length % 4) {
      const alias = original.slice(0, -1) + alphabet[alphabet.indexOf(original.at(-1)) | 1];
      assert.deepEqual(Buffer.from(alias, 'base64url'), Buffer.from(original, 'base64url'));
      assert.equal(current.verify(message, alias, verifying), false);
    }
    for (const invalid of [undefined, null, 3, {}, Buffer.from(original)]) {
      assert.throws(() => current.verify(message, invalid, verifying), TypeError);
    }
  });
}

test('exact algorithm names reject coercion, prototype keys and trailing newlines', () => {
  for (const value of [undefined, null, 0, {}, ['HS256'], new String('HS256'), 'hs256', 'RS256\n',
    'none\n', 'toString', '__proto__', 'constructor', 'ES521', 'EdDSA']) assert.throws(() => jwa(value), TypeError);
  const first = jwa('HS256'); first.sign = () => 'changed';
  assert.notEqual(jwa('HS256').sign(message, 'key'), 'changed');
});

test('none remains an explicit unsecured operation', () => {
  assert.equal(jwa('none').sign(), '');
  assert.equal(jwa('none').verify(null, ''), true);
  for (const signature of [' ', '=', 'AA', null, undefined, Buffer.alloc(0)]) assert.equal(jwa('none').verify(null, signature), false);
});

test('asymmetric algorithms enforce key families and EC curves', () => {
  const k1 = crypto.generateKeyPairSync('ec', { namedCurve: process.versions.bun ? 'secp384r1' : 'secp256k1' });
  const ed = crypto.generateKeyPairSync('ed25519');
  for (const [algorithm, key] of [['RS256', keys.ES256], ['PS256', keys.ES256], ['ES256', keys.RSA],
    ['ES256', keys.ES384], ['ES384', keys.ES512], ['ES512', keys.ES256], ['ES256', k1], ['RS256', ed]]) {
    assert.throws(() => jwa(algorithm).sign(message, key.privateKey), /key.*algorithm/);
    assert.equal(jwa(algorithm).verify(message, 'AA', key.publicKey), false);
  }
  assert.throws(() => jwa('RS256').sign(message, keys.RSA.publicKey), /private key/);
  assert.throws(() => jwa('RS256').verify(message, 'AA', crypto.createSecretKey(Buffer.from('key'))), /asymmetric key/);
});

test('PS algorithms require digest-length salt; RS and PS signatures are distinct', () => {
  for (const bits of [256, 384, 512]) {
    const key = keys.RSA, hash = 'sha' + bits;
    const longSalt = crypto.sign(hash, Buffer.from(message), { key: key.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_SIGN }).toString('base64url');
    assert.equal(jwa('PS' + bits).verify(message, longSalt, key.publicKey), false);
    assert.equal(jwa('PS' + bits).verify(message, jwa('RS' + bits).sign(message, key.privateKey), key.publicKey), false);
    assert.equal(jwa('RS' + bits).verify(message, jwa('PS' + bits).sign(message, key.privateKey), key.publicKey), false);
  }
});

test('RSA signature lengths reject removed or added zero prefixes in every key form', () => {
  for (const { algorithm, message, signature } of require('./fixtures/rsa-lengths.json').leadingZero) {
    const bytes = Buffer.from(signature, 'base64url');
    assert.equal(bytes[0], 0);
    const current = jwa(algorithm);
    for (const key of [keys.RSA.publicKey, keys.RSA.privateKey, keys.RSA.publicPem,
      Buffer.from(keys.RSA.publicPem), { key: keys.RSA.publicPem },
      { key: keys.RSA.publicKey.export({ format: 'der', type: 'pkcs1' }), format: 'der', type: 'pkcs1' },
      { key: keys.RSA.publicKey.export({ format: 'jwk' }), format: 'jwk' }]) {
      assert.equal(current.verify(message, signature, key), true, algorithm);
      for (const changed of [bytes.subarray(1), Buffer.concat([Buffer.alloc(1), bytes]),
        bytes.subarray(0, -1), Buffer.concat([bytes, Buffer.alloc(1)])]) {
        assert.equal(current.verify(message, changed.toString('base64url'), key), false, algorithm);
      }
      // A rejected oversized input must not poison the cached key's later use.
      assert.equal(current.verify(message, 'A'.repeat(20000), key), false);
      assert.equal(current.verify(message, signature, key), true);
    }
  }
});

test('RSA verification supports varied modulus sizes, including non-byte-aligned and large keys', () => {
  for (const { bits, publicPem, message, signature } of require('./fixtures/rsa-lengths.json').sizes) {
    const publicKey = crypto.createPublicKey(publicPem);
    assert.equal(publicKey.asymmetricKeyDetails.modulusLength, bits);
    assert.equal(Buffer.from(signature, 'base64url').length, Math.ceil(bits / 8));
    for (const key of [publicKey, publicPem, Buffer.from(publicPem)]) {
      const current = jwa('RS256');
      assert.equal(current.verify(message, signature, key), true, String(bits));
      assert.equal(current.verify(message, signature.slice(0, -4), key), false);
      assert.equal(current.verify(message, signature + 'AAAA', key), false);
      assert.equal(current.verify(message + '!', signature, key), false);
    }
  }
});

test('restricted RSA-PSS keys retain native restrictions or native unsupported errors', () => {
  const pem = fs.readFileSync(path.join(__dirname, 'fixtures/restricted-rsa-pss.pem'));
  if (process.versions.bun) {
    const unsupported = { code: 'ERR_OSSL_EVP_UNSUPPORTED_ALGORITHM' };
    assert.throws(() => crypto.createPrivateKey(pem), unsupported);
    assert.throws(() => upstream('PS256').sign(message, pem), unsupported);
    assert.throws(() => jwa('PS256').sign(message, pem), unsupported);
    return;
  }
  const privateKey = crypto.createPrivateKey(pem);
  const pair = { privateKey, publicKey: crypto.createPublicKey(privateKey) };
  const signature = jwa('PS256').sign(message, pair.privateKey);
  assert.equal(jwa('PS256').verify(message, signature, pair.publicKey), true);
  assert.throws(() => jwa('RS256').sign(message, pair.privateKey), /algorithm/);
  assert.throws(() => jwa('PS384').sign(message, pair.privateKey));
});

test('HMAC rejects fake/asymmetric keys; invalid key errors survive malformed signatures', () => {
  for (const key of [undefined, null, 2, {}, { type: 'secret', export() {} }, keys.RSA.publicKey, keys.ES256.privateKey]) {
    assert.throws(() => jwa('HS256').sign(message, key), TypeError);
    assert.throws(() => jwa('HS256').verify(message, '!', key), TypeError);
  }
  for (const key of [undefined, null, {}, { type: 'public', asymmetricKeyType: 'rsa', export() {} }, 'bad key']) {
    assert.throws(() => jwa('RS256').verify(message, '!', key));
  }
});

test('exact byte views and ArrayBuffers never include surrounding data', () => {
  const backing = new Uint8Array([99, 1, 2, 3, 88]);
  const views = [backing.subarray(1, 4), new DataView(backing.buffer, 1, 3), Uint8Array.from([1, 2, 3]).buffer];
  const expected = jwa('HS256').sign(Buffer.from([1, 2, 3]), 'key');
  for (const value of views) {
    assert.equal(jwa('HS256').sign(value, 'key'), expected);
    assert.equal(jwa('HS256').verify(value, expected, 'key'), true);
    assert.equal(jwa('HS256').sign(message, value), jwa('HS256').sign(message, Buffer.from([1, 2, 3])));
    const signature = jwa('ES256').sign(value, keys.ES256.privateKey);
    assert.equal(jwa('ES256').verify(Buffer.from([1, 2, 3]), signature, keys.ES256.publicKey), true);
  }
  assert.deepEqual([...backing], [99, 1, 2, 3, 88]);
});

test('JSON serialization runs once and preserves its errors', () => {
  let reads = 0;
  const data = { toJSON() { reads++; return { value: '雪' }; } };
  const signature = jwa('HS256').sign(data, 'key');
  assert.equal(reads, 1); assert.equal(jwa('HS256').verify(data, signature, 'key'), true); assert.equal(reads, 2);
  const error = new Error('serialization');
  assert.throws(() => jwa('HS256').sign({ toJSON() { throw error; } }, 'key'), e => e === error);
  const cyclic = {}; cyclic.self = cyclic;
  for (const value of [undefined, Symbol(), () => {}, 1n, cyclic]) {
    assert.throws(() => jwa('HS256').sign(value, 'key'), TypeError);
    assert.throws(() => jwa('RS256').sign(value, keys.RSA.privateKey), TypeError);
  }
});

test('key import supports encrypted PEM, DER and JWK without mutating options', () => {
  const privateKey = keys.RSA.privateKey;
  const encrypted = privateKey.export({ type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: 'test-only' });
  let reads = 0;
  const options = Object.freeze({ get key() { reads++; return encrypted; }, passphrase: 'test-only' });
  const sig = jwa('RS256').sign(message, options);
  assert.equal(reads, 1); assert.equal(jwa('RS256').verify(message, sig, keys.RSA.publicPem), true);
  assert.equal(jwa('RS256').sign(message, { key: privateKey }), sig);
  assert.equal(jwa('RS256').verify(message, sig, { key: keys.RSA.publicKey }), true);
  for (const format of ['der', 'jwk']) {
    const options = format === 'der' ? { type: 'pkcs8', format } : { format };
    const input = Object.freeze({ key: privateKey.export(options), ...options });
    assert.equal(jwa('RS256').sign(message, input), sig);
  }
  assert.throws(() => jwa('RS256').sign(message, Object.create({ key: keys.RSA.privatePem })), /own key/);
  const override = { key: keys.ES256.privatePem, dsaEncoding: 'der', padding: 999, saltLength: 999 };
  assert.equal(Buffer.from(jwa('ES256').sign(message, override), 'base64url').length, 64);
});

test('public PEM cache remains isolated across algorithms, eviction and mutable buffers', () => {
  const rsa = jwa('RS256'), ec = jwa('ES256');
  const signature = rsa.sign(message, keys.RSA.privateKey);
  const ecSignature = ec.sign(message, keys.ES256.privateKey);
  const encoded = keys.RSA.publicPem.split('\n').slice(1, -2).join('');
  for (let width = 48; width < 68; width++) {
    const lines = encoded.match(new RegExp('.{1,' + width + '}', 'g')).join('\n');
    const pem = '-----BEGIN PUBLIC KEY-----\n' + lines + '\n-----END PUBLIC KEY-----\n';
    assert.equal(rsa.verify(message, signature, pem), true);
    assert.equal(ec.verify(message, ecSignature, pem), false);
  }
  assert.equal(ec.verify(message, ecSignature, keys.ES256.publicPem), true);
  assert.equal(rsa.verify(message, signature, keys.RSA.publicPem), true);
  const mutable = Buffer.from(keys.RSA.publicPem);
  assert.equal(rsa.verify(message, signature, mutable), true);
  mutable.fill(0);
  assert.throws(() => rsa.verify(message, signature, mutable));
  const fresh = crypto.createPublicKey(keys.RSA.publicPem);
  Object.defineProperty(fresh, 'asymmetricKeyType', { value: 'ec' });
  assert.throws(() => ec.verify(message, ecSignature, fresh), /metadata/);
});

test('CryptoKeys import into native crypto and work without DOM globals', async () => {
  const secret = await crypto.webcrypto.subtle.importKey('raw', Buffer.from('test-secret'), { name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify']);
  assert.equal(jwa('HS256').sign(message, secret), jwa('HS256').sign(message, 'test-secret'));
  const pair = await crypto.webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const signature = jwa('ES256').sign(message, pair.privateKey);
  assert.equal(jwa('ES256').verify(message, signature, pair.publicKey), true);
  const sealed = await crypto.webcrypto.subtle.importKey('raw', Buffer.from('test-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  assert.throws(() => jwa('HS256').sign(message, sealed), /extractable/);
});

test('deterministic malformed-signature corpus never verifies', () => {
  for (const algorithm of algorithms) {
    const key = algorithm.startsWith('HS') ? 'key' : keys[algorithm.startsWith('ES') ? algorithm : 'RSA'].publicKey;
    for (let n = 0; n < 150; n++) {
      const bytes = Buffer.alloc(n); for (let i = 0; i < n; i++) bytes[i] = (n * 31 + i * 17) & 255;
      assert.equal(jwa(algorithm).verify(message, bytes.toString('base64url'), key), false);
    }
  }
});

test('CJS/ESM callable export and package boundary', async () => {
  assert.equal((await import('../index.js')).default, jwa);
  const metadata = require('../package.json');
  assert.equal(metadata.dependencies, undefined);
  assert.equal(metadata.license, 'MIT');
});

test('retained upstream files match provenance hashes', () => {
  for (const [file, expected] of Object.entries(require('../PROVENANCE.json').sha256)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', file))).digest('hex'), expected, file);
  }
});
