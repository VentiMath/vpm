'use strict';
// The hooks are exercised by upstream's suite in
// scripts/tanstack-query-conformance (React is installed there). These checks
// cover the derivation: every file is 5.105.0's apart from the core's name.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const root = path.join(__dirname, '..');
const provenance = require('../PROVENANCE.json'), metadata = require('../package.json');
const sha256 = data => createHash('sha256').update(data).digest('hex');

test('package metadata: vtanstack-query-core and React peers, modern build only', () => {
  assert.deepEqual(metadata.dependencies, {'vtanstack-query-core': '0.1.0'});
  assert.deepEqual(metadata.peerDependencies, {'@types/react': '^18 || ^19', react: '^18 || ^19'});
  assert.equal(metadata.vpm.platform, 'browser');
  assert.deepEqual(metadata.files, ['build/modern', 'README.md', 'LICENSE', 'PROVENANCE.json']);
  assert.ok(!fs.existsSync(path.join(root, 'build/legacy')) && !fs.existsSync(path.join(root, 'build/codemods')) && !fs.existsSync(path.join(root, 'src')));
});

test('files differ from 5.105.0 only in the core package name', () => {
  assert.deepEqual(provenance.removed, []);
  const modified = new Set(provenance.modified);
  for (const [file, hash] of Object.entries(provenance.sourceSHA256)) {
    const data = fs.readFileSync(path.join(root, file));
    if (!modified.has(file)) { assert.equal(sha256(data), hash, file); continue; }
    const text = data.toString('utf8');
    assert.match(text, /["']vtanstack-query-core["']/, file);
    assert.equal(sha256(text.replaceAll('"vtanstack-query-core"', '"@tanstack/query-core"').replaceAll("'vtanstack-query-core'", "'@tanstack/query-core'")), hash, file);
  }
});

test('no module imports the original core', () => {
  for (const file of Object.keys(provenance.sourceSHA256).filter(file => /\.(c?js|d\.c?ts)$/.test(file))) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, file), 'utf8'), /(from|require\()\s*["']@tanstack\/query-core["']/, file);
  }
});
