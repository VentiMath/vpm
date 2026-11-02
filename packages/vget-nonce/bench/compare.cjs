'use strict';
const path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
require('../../../scripts/bench-process.cjs').run({root,
  upstream: path.resolve(root, '../../scripts/sidecar-conformance/node_modules/get-nonce'), vpm: root,
  files: ['package.json','index.cjs','index.mjs','bench/compare.cjs','../../scripts/sidecar-conformance/package-lock.json','../../scripts/sidecar-conformance/node_modules/get-nonce'],
  cases: [{name: 'configure and read nonce', make: file => {const api=require(file); return () => {api.setNonce('provided'); return api.getNonce();};}, validate: x => assert.equal(x,'provided')}]
}).catch(e => {console.error(e); process.exitCode=1;});
