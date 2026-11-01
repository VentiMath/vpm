'use strict';
// The calendar itself is exercised in scripts/fullcalendar-react-conformance
// (upstream's React and browser suites, with React installed there). These
// checks cover the derivation: every file is upstream's, apart from the
// package names, shared JSON feed request and setDates flag preservation.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const root = path.join(__dirname, '..');
const provenance = require('../PROVENANCE.json'), metadata = require('../package.json');
const sha256 = text => createHash('sha256').update(text).digest('hex');
const REQUEST_CHUNKS = ['chunks/cb8ba596.js', 'chunks/0472806b.d.ts'];

test('package metadata: VPM dependencies, React peers, no polyfill', () => {
  assert.equal(metadata.version, provenance.upstream.version);
  assert.deepEqual(metadata.dependencies, {'vfull-ui-headless-calendar': 'workspace:*', 'vfullcalendar-core': 'workspace:*'});
  assert.deepEqual(metadata.peerDependencies, {react: '^17 || ^18 || ^19', 'react-dom': '^17 || ^18 || ^19'});
  assert.equal(metadata.type, 'module');
  assert.equal(metadata.vpm.platform, 'browser');
  assert.deepEqual(metadata.sideEffects, ['**/*.css']);
  for (const [subpath, target] of Object.entries(metadata.exports)) {
    if (subpath.includes('*')) continue;
    for (const file of typeof target === 'string' ? [target] : Object.values(target)) assert.ok(fs.existsSync(path.join(root, file)), subpath + ' ' + file);
  }
});

test('unmodified files are byte-identical to 7.1.3', () => {
  const modified = new Set(provenance.modified);
  let checked = 0;
  for (const [file, hash] of Object.entries(provenance.sourceSHA256)) {
    if (modified.has(file)) continue;
    assert.equal(sha256(fs.readFileSync(path.join(root, file))), hash, file);
    checked++;
  }
  assert.ok(checked > 200);
});

test('modified files match the documented dependency, feed and setDates changes', () => {
  for (const file of provenance.modified.filter(file => !REQUEST_CHUNKS.includes(file))) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(text, /'vfull-ui-headless-calendar'|'vfullcalendar-core\/protected-api'/, file);
    let restored = text.replaceAll("'vfull-ui-headless-calendar'", "'@full-ui/headless-calendar'").replaceAll("'vfullcalendar-core/protected-api'", "'@fullcalendar/core/protected-api'");
    if (file === 'chunks/4bb94a70.js') restored = restored.replace('let standardProps = options.allDay === undefined ? {} : { allDay: options.allDay };', 'let standardProps = { allDay: options.allDay };');
    assert.equal(sha256(restored), provenance.sourceSHA256[file], file);
  }
});

test('no file imports the original calendar packages or temporal-polyfill', () => {
  const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => entry.isDirectory() ? (['test', 'bench'].includes(entry.name) ? [] : walk(path.join(dir, entry.name))) : [path.join(dir, entry.name)]);
  const sources = walk(root).filter(file => /\.(js|d\.ts)$/.test(file));
  assert.equal(sources.length, 223);
  for (const file of sources) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /['"](@full-ui\/headless-calendar|@fullcalendar\/core[^'"]*|temporal-polyfill[^'"]*)['"]/, file);
});

test('the JSON feed request is vfullcalendar-core\'s', async () => {
  const chunk = fs.readFileSync(path.join(root, 'chunks/cb8ba596.js'), 'utf8');
  assert.match(chunk, /^import \{ JsonRequestError, requestJson \} from 'vfullcalendar-core\/protected-api';$/m);
  assert.doesNotMatch(chunk, /function requestJson|class JsonRequestError/);
  assert.match(chunk, /export \{ JsonRequestError as J,.* requestJson as e,/);
  assert.match(fs.readFileSync(path.join(root, 'chunks/0472806b.d.ts'), 'utf8'), /export \{ JsonRequestError as J, requestJson as r \} from 'vfullcalendar-core\/protected-api';/);
});
