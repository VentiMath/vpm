'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const upstream = require.resolve('../../../scripts/base64-js-conformance/node_modules/base64-js');
const cases = [];
for (const size of [32,4096]) {
  const bytes = Uint8Array.from({length:size}, (_, i) => (i * 31) % 256);
  const encoded = Buffer.from(bytes).toString('base64');
  for (const method of ['fromByteArray','toByteArray']) {
    const encode = method === 'fromByteArray';
    cases.push({
      name: (encode ? 'encode ' : 'decode ') + size + ' bytes',
      make(file) { const fn = require(file)[method]; return () => fn(encode ? bytes : encoded); },
      validate(value) { assert.deepEqual(value, encode ? encoded : bytes); }
    });
  }
}
require('../../../scripts/bench-process.cjs').run({root, upstream, vpm:root, cases,
  files:['index.cjs','package.json','PROVENANCE.json','bench/compare.cjs','../../scripts/base64-js-conformance/package-lock.json']
}).catch(e => { console.error(e); process.exitCode=1; });
