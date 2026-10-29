'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { keys, upstream } = require('./helpers.cjs');
const { upstreamModule } = require('../../vjwa/test/helpers.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vjws-conformance-'));
after(() => fs.rmSync(directory, { recursive: true, force: true }));
const fixtures = path.join(__dirname, 'fixtures/upstream');
fs.copyFileSync(path.join(fixtures, 'data.txt'), path.join(directory, 'data.txt'));
function writePair(name, pair) {
  fs.writeFileSync(path.join(directory, name + '-private.pem'), pair.privateKey.export({ format: 'pem', type: 'pkcs8' }));
  fs.writeFileSync(path.join(directory, name + '-public.pem'), pair.publicKey.export({ format: 'pem', type: 'spki' }));
}
writePair('rsa', keys.RSA);
writePair('rsa-wrong', crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }));
for (const [bits, curve] of [[256, process.versions.bun ? 'secp384r1' : 'secp256k1'], [384, 'secp384r1'], [512, 'secp521r1']]) {
  writePair('ec' + bits, keys['ES' + bits]);
  writePair('ec' + bits + '-wrong', crypto.generateKeyPairSync('ec', { namedCurve: curve }));
}
fs.writeFileSync(path.join(directory, 'encrypted-key-passphrase'), 'test-only');
fs.writeFileSync(path.join(directory, 'rsa-private-encrypted.pem'), keys.RSA.privateKey.export({ format: 'pem', type: 'pkcs8', cipher: 'aes-256-cbc', passphrase: 'test-only' }));
for (const [label, implementation] of [['baseline', upstream], ['VPM', require('..')]]) {
  const registered = [];
  let source = fs.readFileSync(path.join(fixtures, 'jws.test.txt'), 'utf8');
  if (label === 'VPM') {
    // Malformed compact input now returns false before importing a key. Keep
    // the upstream invalid-key error assertion, using a structurally valid JWS.
    const previous = "signature: 'a.b.c', // the short/invalid length signature will make jwa throw";
    assert.equal(source.split(previous).length, 2);
    source = source.replace(previous, "signature: 'eyJhbGciOiJFUzUxMiJ9.eA.AA', // valid compact input, invalid key");
  }
  const helpers = { tape: (name, fn) => registered.push({ name, fn }),
    'safe-buffer': upstreamModule('safe-buffer'),
    semver: { clean: value => value, gte: (_version, range) => { assert.equal(range, '0.11.8'); return true; } } };
  const native = createRequire(path.join(fixtures, 'jws.test.txt'));
  new Function('require', '__dirname', source)(name => name === '..' ? implementation : Object.hasOwn(helpers, name) ? helpers[name] : native(name), directory);
  assert.equal(registered.length, 31, 'all upstream cases registered');
  for (const { name, fn } of registered) test('upstream ' + label + ': ' + name, () => new Promise((resolve, reject) => {
    let ended = false, count = 0;
    const timer = setTimeout(() => reject(new Error('upstream test timed out: ' + name)), 5000);
    function check(assertion, ...args) {
      try { assert.equal(ended, false, 'assertion after end'); count++; assertion(...args); }
      catch (error) { clearTimeout(timer); reject(error); }
    }
    const t = { ok: (...args) => check(assert.ok, ...args), true: (...args) => check(assert.equal, ...[args[0], true, args[1]]),
      notOk: (value, message) => check(assert.equal, !!value, false, message),
      same: (...args) => check(assert.deepEqual, ...args), equal: (...args) => check(assert.equal, ...args),
      throws: (...args) => check(assert.throws, ...args), fail: message => check(assert.fail, message),
      end() { clearTimeout(timer); assert.equal(ended, false, 'duplicate end'); ended = true; resolve(); } };
    try { fn(t); } catch (error) { clearTimeout(timer); reject(error); }
  }));
}
