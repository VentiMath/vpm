'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const modules = path.join(__dirname, 'node_modules');
const fixture = fs.mkdtempSync(path.join(modules, '.codec-'));
try {
  const deps = path.join(fixture, 'node_modules');
  fs.mkdirSync(deps);
  const codec = process.env.VBASE64_JS_PACKAGE || path.resolve(__dirname, '../../packages/vbase64-js');
  fs.symlinkSync(codec, path.join(deps, 'base64-js'));
  for (const name of ['buffer','plist']) {
    fs.cpSync(path.join(modules, name), path.join(deps, name), {recursive: true});
    const load = createRequire(path.join(deps, name, 'package.json'));
    assert.equal(fs.realpathSync(load.resolve('base64-js')), require.resolve(codec));
  }
  const load = createRequire(path.join(fixture, 'consumer.cjs'));
  const BufferImpl = load('buffer/').Buffer;
  const plist = load('plist');
  const bytes = Uint8Array.of(0, 253, 254, 255);
  assert.equal(BufferImpl.from(bytes).toString('base64'), 'AP3+/w==');
  assert.deepEqual([...BufferImpl.from('AP3-_w', 'base64')], [...bytes]);
  const xml = plist.build({payload: bytes});
  assert.equal(xml, require('plist').build({payload: bytes}));
  assert.deepEqual([...plist.parse(xml).payload], [...bytes]);
  console.log('Browser Buffer and plist round trips pass with the replacement installed.');
} finally {
  fs.rmSync(fixture, {recursive:true, force:true});
}
