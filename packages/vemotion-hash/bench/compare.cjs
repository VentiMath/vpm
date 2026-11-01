'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const original = require('../../../scripts/emotion-conformance/node_modules/@emotion/hash').default;
(async () => {
  const {default: hash} = await import('../index.js');
  const inputs = {
    ascii: 'display:flex;align-items:center;padding:8px 16px;&:hover{background-color:rgba(0,0,0,.04);}label:Button-root;',
    'non-ASCII (different hash semantics)': 'font-family:"游ゴシック",sans-serif;&::before{content:"→";}label:Title;',
  };
  const cases = Object.entries(inputs).map(([name, value]) => {
    const expected = new Set([original(value), hash(value)]);
    return {name, make: fn => () => fn(value), validate: output => assert.ok(expected.has(output))};
  });
  await require('../../../scripts/bench-paired.cjs').run({
    root: path.resolve(__dirname, '..'), upstream: original, vpm: hash, cases,
    files: ['index.js', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs',
      '../../scripts/emotion-conformance/node_modules/@emotion/hash'],
  });
})().catch(error => { console.error(error); process.exitCode = 1; });
