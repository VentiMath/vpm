'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {createRequire} = require('node:module');
const from = createRequire(path.resolve(__dirname, '../sidecar-conformance/package.json'));
const {JSDOM} = from('jsdom');
assert.equal(from('get-nonce/package.json').version, '1.0.1');
assert.equal(from('react-style-singleton/package.json').version, '2.2.3');
const vpm = require('../../packages/vget-nonce');
async function run() {
  for (const api of [from('get-nonce'), vpm]) {
    delete globalThis.__webpack_nonce__;
    api.setNonce(undefined); assert.equal(api.getNonce(), undefined);
    globalThis.__webpack_nonce__ = 'bundler'; assert.equal(api.getNonce(), 'bundler');
    api.setNonce('explicit'); assert.equal(api.getNonce(), 'explicit');
    globalThis.__webpack_nonce__ = 'changed'; assert.equal(api.getNonce(), 'explicit');
    api.setNonce(''); assert.equal(api.getNonce(), 'changed');
    api.setNonce(undefined); delete globalThis.__webpack_nonce__;
    assert.equal(api.getNonce(), undefined);
    // Execute the unchanged caller source, replacing only the nonce import.
    const file = path.join(path.dirname(from.resolve('react-style-singleton')), 'singleton.js');
    const mod = {exports: {}}, dom = new JSDOM('<!doctype html><head></head>');
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {exports: mod.exports, module: mod,
      require: n => {assert.equal(n, 'get-nonce'); return api;}, document: dom.window.document});
    const sheet = mod.exports.stylesheetSingleton(); api.setNonce('caller');
    sheet.add('body { overflow: hidden; }'); sheet.add('ignored');
    assert.equal(dom.window.document.head.children.length, 1);
    assert.equal(dom.window.document.querySelector('style').nonce, 'caller');
    sheet.remove(); assert.equal(dom.window.document.head.children.length, 1);
    sheet.remove(); assert.equal(dom.window.document.head.children.length, 0);
    api.setNonce(undefined); dom.window.close();
  }
  const esm = await import('../../packages/vget-nonce/index.mjs');
  esm.setNonce('shared'); assert.equal(vpm.getNonce(), 'shared');
  vpm.setNonce(undefined); assert.equal(esm.getNonce(), undefined);
  assert.equal(esm.getNonce, vpm.getNonce);
  console.log('Nonce precedence/reset, shared CJS/ESM state and original stylesheet caller pass.');
}
run().catch(e => {console.error(e); process.exitCode = 1;});
