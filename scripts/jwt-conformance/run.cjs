'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const archive = path.join(__dirname, 'jsonwebtoken-9.0.3.tar.gz');
const provenance = require('../../packages/vjsonwebtoken/PROVENANCE.json');
assert.equal(createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), provenance.source.archiveSha256);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vjwt-conformance-'));
const upstream = process.argv.includes('--upstream');
let restrictedPssUnsupported = false;
try {
  const extract = spawnSync('tar', ['-xzf', archive, '--strip-components=1', '-C', temporary], { encoding: 'utf8' });
  assert.equal(extract.status, 0, extract.stderr);
  const modules = path.join(temporary, 'node_modules');
  fs.mkdirSync(modules);
  for (const name of fs.readdirSync(path.join(__dirname, 'node_modules'))) {
    fs.symlinkSync(path.join(__dirname, 'node_modules', name), path.join(modules, name));
  }
  const consumer = path.join(root, 'scripts/consumers/node_modules');
  fs.symlinkSync(path.join(consumer, 'jws'), path.join(modules, 'jws'), 'dir');
  const target = upstream ? path.join(consumer, 'jsonwebtoken') : path.join(root, 'packages/vjsonwebtoken');
  if (process.versions.bun) {
    // BoringSSL rejects the upstream explicit-parameter EC public encodings.
    // Re-encode the same public points as named-curve SPKI with Node; keys,
    // signatures and test assertions remain unchanged on both implementations.
    const converted = spawnSync('node', ['-e', `
      const c = require('node:crypto'), fs = require('node:fs'), path = require('node:path');
      for (const name of ['ecdsa-public.pem', 'ecdsa-public-invalid.pem']) {
        const file = path.join(process.argv[1], 'test', name);
        const key = c.createPublicKey(fs.readFileSync(file));
        const jwk = key.export({format:'jwk'});
        fs.writeFileSync(file, c.createPublicKey({key:jwk, format:'jwk'}).export({format:'pem', type:'spki'}));
      }
    `, temporary], { encoding: 'utf8' });
    assert.equal(converted.status, 0, converted.stderr);
    // Bun's crypto runtime cannot import restricted RSA-PSS keys. Keep these
    // three cases registered as pending on both sides; ordinary RSA/PSS runs.
    try { require('node:crypto').createPrivateKey(fs.readFileSync(path.join(temporary, 'test/rsa-pss-private.pem'))); }
    catch (error) { assert.equal(error.code, 'ERR_OSSL_EVP_UNSUPPORTED_ALGORITHM'); restrictedPssUnsupported = true; }
    if (restrictedPssUnsupported) {
      const file = path.join(temporary, 'test/validateAsymmetricKey.tests.js');
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace("describe('RSA-PSS algorithms'", "describe.skip('RSA-PSS algorithms'")
        .replace("const key = loadKey('rsa-pss-private.pem');", 'const key = null; // restricted RSA-PSS import unsupported by this runtime'));
    }
  }
  for (const [file, expression] of Object.entries({ 'index.js': `require(${JSON.stringify(target)})`,
    'lib/JsonWebTokenError.js': `require(${JSON.stringify(target)}).JsonWebTokenError`,
    'lib/NotBeforeError.js': `require(${JSON.stringify(target)}).NotBeforeError`,
    'lib/TokenExpiredError.js': `require(${JSON.stringify(target)}).TokenExpiredError` })) {
    fs.writeFileSync(path.join(temporary, file), 'module.exports = ' + expression + ';\n');
  }
  // Keep independent upstream JWS for constructing malformed/specially crafted
  // tokens; tests must not accidentally exercise VPM on both sides.
  fs.writeFileSync(path.join(temporary, 'setup.cjs'), `
// Runtime dependencies are pinned in scripts/consumers; test tools live separately.
`);
  if (!upstream) {
    fs.writeFileSync(path.join(temporary, 'lib/validateAsymmetricKey.js'), 'module.exports = (alg, key) => { if (alg && key) return require(' + JSON.stringify(path.join(target, 'lib/keys')) + ').validate(alg, key, key.type === "private", true); };\n');
    require('./adapt.cjs')(temporary);
  }
  const reportFile = path.join(temporary, 'report.json');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'node_modules/mocha/bin/mocha.js'),
    '--require', './setup.cjs', '--reporter', 'json', '--reporter-option', 'output=' + reportFile,
    '--timeout', '5000', 'test/*.js'], { cwd: temporary, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 120000 });
  if (result.error) throw result.error;
  if (!fs.existsSync(reportFile)) throw new Error(result.stdout + result.stderr);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.stats.tests, 512, 'all original cases remain registered');
  assert.equal(report.stats.pending, (upstream ? 1 : 0) + (restrictedPssUnsupported ? 3 : 0), 'only documented cases may be pending');
  assert.equal(report.stats.failures, report.failures.length);
  if (process.env.OUTPUT) fs.copyFileSync(reportFile, process.env.OUTPUT);
  console.log(JSON.stringify({ runtime: process.version, bun: process.versions.bun, target: upstream ? 'jsonwebtoken' : 'vjsonwebtoken', ...report.stats }, null, 2));
  for (const failure of report.failures) console.log(failure.fullTitle + '\n' + failure.err.message);
  process.exitCode = result.status;
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
