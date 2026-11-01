'use strict';
// compile + prefixer + stringify, vstylis against the pinned stylis 4.4.0
// (scripts/stylis-conformance), on Bootstrap 5.3.8's stylesheet and on a
// rule the size of one MUI component's styles. Median of 7 rounds.
const fs = require('node:fs'), path = require('node:path'), {pathToFileURL} = require('node:url');
const fixture = path.resolve(__dirname, '../../../scripts/stylis-conformance/node_modules');
const runtime = typeof Bun !== 'undefined' ? `bun-${Bun.version}` : `node-${process.versions.node}`;

(async () => {
  const libraries = {
    'stylis 4.4.0': await import(pathToFileURL(path.join(fixture, 'stylis/index.js')).href),
    vstylis: await import(pathToFileURL(path.join(__dirname, '../index.js')).href),
  };
  const inputs = {
    'bootstrap.css': [fs.readFileSync(path.join(fixture, 'bootstrap/dist/css/bootstrap.css'), 'utf8'), 20],
    'component rule': ['.css-1x{display:flex;align-items:center;padding:8px 16px;&:hover{background-color:rgba(0,0,0,.04);}@media (min-width:600px){padding:6px 12px;}&.Mui-disabled{opacity:.38;}}', 20000],
  };
  const run = (library, css) => library.serialize(library.compile(css), library.middleware([library.prefixer, library.stringify]));
  const results = {runtime, unit: 'microseconds per operation', inputs: {}};
  for (const [input, [css, count]] of Object.entries(inputs)) {
    const rounds = Object.fromEntries(Object.keys(libraries).map(name => [name, []]));
    for (let round = 0; round < 7; round++) {
      for (const [name, library] of Object.entries(libraries)) {
        run(library, css);
        const start = performance.now();
        for (let i = 0; i < count; i++) run(library, css);
        rounds[name].push(((performance.now() - start) * 1000) / count);
      }
    }
    results.inputs[input] = Object.fromEntries(Object.entries(rounds).map(([name, times]) => [name, +times.sort((a, b) => a - b)[3].toFixed(1)]));
  }
  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(__dirname, 'results', runtime.split('-')[0] + '.json'), JSON.stringify(results, null, 2) + '\n');
})();
