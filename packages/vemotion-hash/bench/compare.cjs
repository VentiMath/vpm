'use strict';
// vemotion-hash against the pinned @emotion/hash 0.9.2
// (scripts/emotion-conformance) on a serialized component style (ASCII) and on
// one with non-ASCII content. Median of 7 rounds of 500,000 calls.
const fs = require('node:fs'), path = require('node:path'), {pathToFileURL} = require('node:url');
const original = require('../../../scripts/emotion-conformance/node_modules/@emotion/hash').default;
const runtime = typeof Bun !== 'undefined' ? `bun-${Bun.version}` : `node-${process.versions.node}`;

(async () => {
  const {default: hash} = await import(pathToFileURL(path.join(__dirname, '../index.js')).href);
  const inputs = {
    ascii: 'display:flex;align-items:center;padding:8px 16px;&:hover{background-color:rgba(0,0,0,.04);}label:Button-root;',
    'non-ASCII': 'font-family:"游ゴシック",sans-serif;&::before{content:"→";}label:Title;',
  };
  const results = {runtime, unit: 'nanoseconds per call', inputs: {}};
  for (const [input, value] of Object.entries(inputs)) {
    const rounds = {'@emotion/hash 0.9.2': [], 'vemotion-hash': []};
    for (let round = 0; round < 7; round++) {
      for (const [name, fn] of [['@emotion/hash 0.9.2', original], ['vemotion-hash', hash]]) {
        const start = performance.now();
        for (let i = 0; i < 500000; i++) fn(value);
        rounds[name].push(((performance.now() - start) * 1e6) / 500000);
      }
    }
    results.inputs[input] = Object.fromEntries(Object.entries(rounds).map(([name, times]) => [name, +times.sort((a, b) => a - b)[3].toFixed(1)]));
  }
  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(__dirname, 'results', runtime.split('-')[0] + '.json'), JSON.stringify(results, null, 2) + '\n');
})();
