'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { keys, upstream, upstreamModule } = require('./helpers.cjs');

// Unchanged upstream assertions, including OpenSSL interoperability and RFC
// 7515 vectors. Adapters replace only the historical test runner/helpers.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vjwa-conformance-'));
after(() => fs.rmSync(directory, { recursive: true, force: true }));
fs.cpSync(path.join(__dirname, 'fixtures/upstream/tests'), directory, { recursive: true });
const rsaWrong = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const writePair = (name, pair) => {
  fs.writeFileSync(path.join(directory, name + '-private.pem'), pair.privateKey.export({ type: 'pkcs8', format: 'pem' }));
  fs.writeFileSync(path.join(directory, name + '-public.pem'), pair.publicKey.export({ type: 'spki', format: 'pem' }));
};
writePair('rsa', keys.RSA); writePair('rsa-wrong', rsaWrong);
fs.writeFileSync(path.join(directory, 'rsa-passphrase-private.pem'), keys.RSA.privateKey.export({ type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase: 'test_pass' }));
fs.writeFileSync(path.join(directory, 'rsa-passphrase-public.pem'), keys.RSA.publicPem);
// Bun cannot generate secp256k1; use a supported, still-wrong curve there.
for (const [bits, curve] of [[256, process.versions.bun ? 'secp384r1' : 'secp256k1'], [384, 'secp384r1'], [512, 'secp521r1']]) {
  writePair('ec' + bits, keys['ES' + bits]);
  writePair('ec' + bits + '-wrong', crypto.generateKeyPairSync('ec', { namedCurve: curve }));
}
const base64url = value => Buffer.from(value).toString('base64url');
base64url.toBuffer = value => Buffer.from(value, 'base64url');
const jwkToPem = (key, options) => (options?.private ? crypto.createPrivateKey({ key, format: 'jwk' }) : crypto.createPublicKey({ key, format: 'jwk' }))
  .export({ type: options?.private ? 'pkcs8' : 'spki', format: 'pem' });
for (const [label, implementation] of [['baseline', upstream], ['VPM', require('..')]]) {
  const registered = [];
  for (const file of ['jwa.test.txt', ...[1, 2, 3, 4, 5].map(n => 'A.' + n + '/test.js')]) {
    const location = path.join(directory, file), native = createRequire(location);
    const helpers = {
      tap: { test: (name, fn) => registered.push({ name, fn }) },
      base64url, 'jwk-to-pem': jwkToPem,
      'safe-buffer': upstreamModule('safe-buffer'),
      'ecdsa-sig-formatter': upstreamModule('ecdsa-sig-formatter'),
      semver: {
        clean: version => version,
        gte(version, range) { assert.equal(range, '0.11.8'); return true; },
        satisfies(version, range) { assert.equal(range, '^6.12.0 || >=8.0.0'); return true; },
      },
    };
    new Function('require', '__dirname', fs.readFileSync(location, 'utf8'))(name => {
      if (name === '..' || name === '../../') return implementation;
      return Object.hasOwn(helpers, name) ? helpers[name] : native(name);
    }, path.dirname(location));
  }
  assert.equal(registered.length, 65, 'all upstream tests registered');
  for (const { name, fn } of registered) test('upstream ' + label + ': ' + name, () => new Promise((resolve, reject) => {
    let count = 0, planned, ended = false;
    const timer = setTimeout(() => reject(new Error('upstream test did not finish: ' + name)), 10000);
    function finish() { clearTimeout(timer); resolve(); }
    function check(assertion, ...args) {
      try {
        assert.equal(ended, false, 'assertion after end'); count++; assertion(...args);
        if (planned !== undefined && count === planned) { ended = true; finish(); }
      } catch (error) { clearTimeout(timer); reject(error); }
    }
    try {
      fn({
        ok: (...args) => check(assert.ok, ...args),
        notOk: (value, message) => check(assert.equal, !!value, false, message),
        same: (...args) => check(assert.deepEqual, ...args),
        equivalent: (...args) => check(assert.deepEqual, ...args),
        equal: (...args) => check(assert.equal, ...args),
        fail: message => check(assert.fail, message),
        plan(value) { assert.equal(planned, undefined); planned = value; },
        end() {
          assert.equal(ended, false, 'duplicate end'); ended = true;
          if (planned !== undefined) assert.equal(count, planned);
          finish();
        },
      });
    } catch (error) { clearTimeout(timer); reject(error); }
  }));
}
