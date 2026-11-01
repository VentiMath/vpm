'use strict';
process.env.NODE_ENV = 'production';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const fixture = path.resolve(root, '../../scripts/emotion-conformance/node_modules');
const loaded = new Map();
function load(library) {
  if (!loaded.has(library)) loaded.set(library, library === 'upstream'
    ? require(path.join(fixture, '@emotion/cache')).default : require('../index.js').default);
  return loaded.get(library);
}
// The application wraps every top-level rule in @layer mui.
const wrapInLayer = node => {
  if (node.root) return;
  const child = {...node, parent: node, root: node};
  Object.assign(node, {children: [child], length: 6, parent: null, props: ['mui'], return: '', root: null, type: '@layer', value: '@layer mui'});
};
const styles = 'color:red;display:flex;:hover{color:blue;}';
const expected = '.bench-a{color:red;display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;}.bench-a:hover{color:blue;}';
const cases = [
  {name: 'construct default server cache', make: library => {const create = load(library); return () => create({key: 'bench'});}, validate: cache => {assert.equal(cache.key, 'bench'); assert.equal(typeof cache.insert, 'function');}},
  {name: 'construct application plugin server cache', make: library => {const create = load(library), options = {key: 'mui', stylisPlugins: [wrapInLayer]}; return () => create(options);}, validate: cache => assert.equal(cache.key, 'mui')},
  {name: 'reuse compiled default style', make: library => {
    const cache = load(library)({key: 'bench'}), value = {name: 'a', styles};
    cache.insert('.bench-a', value, cache.sheet, true);
    return () => cache.insert('.bench-a', value, cache.sheet, true);
  }, validate: value => assert.equal(value, expected)},
  {name: 'compile new default style', make: library => {
    const cache = load(library)({key: 'bench'}); let n = 0;
    return () => {const name = 'n' + n++; return cache.insert('.bench-' + name, {name, styles}, cache.sheet, false);};
  }, validate: value => {assert.match(value, /^\.bench-n[0-9]+\{color:red;/); assert.ok(value.endsWith(':hover{color:blue;}'));}},
  {name: 'compile new application layer style', make: library => {
    const cache = load(library)({key: 'mui', stylisPlugins: [wrapInLayer]}); let n = 0;
    return () => {const name = 'n' + n++; return cache.insert('.mui-' + name, {name, styles}, cache.sheet, false);};
  }, validate: value => {assert.match(value, /^@layer mui\{\.mui-n[0-9]+\{color:red;display:flex;/); assert.ok(value.endsWith(':hover{color:blue;}}'));}},
  {name: 'reuse compiled application layer style', make: library => {
    const cache = load(library)({key: 'mui', stylisPlugins: [wrapInLayer]}), value = {name: 'a', styles};
    cache.insert('.mui-a', value, cache.sheet, true);
    return () => cache.insert('.mui-a', value, cache.sheet, true);
  }, validate: value => assert.equal(value, '@layer mui{.mui-a{color:red;display:flex;}}@layer mui{.mui-a :hover{color:blue;}}')},
];
const files = ['index.js', 'src', 'package.json', 'bench/compare.cjs',
  '../../scripts/emotion-conformance/package-lock.json', '../../scripts/emotion-conformance/node_modules/@emotion/cache',
  '../../scripts/emotion-conformance/node_modules/@emotion/sheet', '../../scripts/emotion-conformance/node_modules/@emotion/memoize',
  '../../scripts/emotion-conformance/node_modules/@emotion/weak-memoize', '../../scripts/emotion-conformance/node_modules/stylis'];
for (const name of ['vemotion-sheet', 'vstylis']) {
  const metadata = require(path.join(root, '..', name, 'package.json'));
  for (const file of metadata.files) if (!/README|PROVENANCE|LICENSE|\.d\.ts/.test(file)) files.push(path.join('..', name, file));
}
require('../../../scripts/bench-process.cjs').run({root, upstream: 'upstream', vpm: 'vpm', cases, files})
  .catch(error => {console.error(error); process.exitCode = 1;});
