'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const expectedRows = require('./expected.json');
(async () => {
  const {upstream, vpm} = await require('../../../scripts/bench-library.cjs').load({upstream: () => require('../../../scripts/emotion-conformance/node_modules/@emotion/hash').default, vpm: async () => (await import('../index.js')).default});
  const inputs = {
    ascii: 'display:flex;align-items:center;padding:8px 16px;&:hover{background-color:rgba(0,0,0,.04);}label:Button-root;',
    'non-ASCII (different hash semantics)': 'font-family:"游ゴシック",sans-serif;&::before{content:"→";}label:Title;',
  };
  const cases = Object.entries(inputs).map(([name, value], index) => {
    const expected = new Set(expectedRows[index]);
    return {name, make: fn => () => fn(value), validate: output => assert.ok(expected.has(output))};
  });
  await require('../../../scripts/bench-paired.cjs').run({
    root: path.resolve(__dirname, '..'), upstream, vpm, cases,
    files: ['index.js', 'package.json', 'bench/expected.json', '../../scripts/bench-library.cjs', 'bench/compare.cjs',
      '../../scripts/emotion-conformance/node_modules/@emotion/hash'],
  });
})().catch(error => { console.error(error); process.exitCode = 1; });
