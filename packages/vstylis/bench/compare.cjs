'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const fixture = path.resolve(__dirname, '../../../scripts/stylis-conformance/node_modules');
(async () => {
  const {upstream, vpm} = await require('../../../scripts/bench-library.cjs').load({upstream: () => import(pathToFileURL(path.join(fixture, 'stylis/index.js'))), vpm: () => import('../index.js')});
  const expectedRows = require('./expected.json');
  const {createHash} = require('node:crypto');
  const inputs = {
    'bootstrap.css': fs.readFileSync(path.join(fixture, 'bootstrap/dist/css/bootstrap.css'), 'utf8'),
    'component rule': '.css-1x{display:flex;align-items:center;padding:8px 16px;&:hover{background-color:rgba(0,0,0,.04);}@media (min-width:600px){padding:6px 12px;}&.Mui-disabled{opacity:.38;}}',
  };
  const cases = Object.entries(inputs).map(([name, css]) => {
    // Prefix corrections intentionally change some output. Check each full
    // result, not just its length, without including validation in timing.
    const expected = new Set(expectedRows[name]);
    return {name, make: lib => {
      const {compile, serialize, middleware, prefixer, stringify} = lib;
      const pipeline = middleware([prefixer, stringify]);
      return () => serialize(compile(css), pipeline);
    }, validate: output => assert.ok(expected.has(createHash('sha256').update(output).digest('hex')))};
  });
  const files = ['package.json', 'bench/expected.json', '../../scripts/bench-library.cjs', 'index.js', 'bench/compare.cjs',
    '../../scripts/stylis-conformance/package-lock.json',
    '../../scripts/stylis-conformance/node_modules/bootstrap/dist/css/bootstrap.css',
    '../../scripts/stylis-conformance/node_modules/stylis/index.js'];
  for (const dir of ['src', '../../scripts/stylis-conformance/node_modules/stylis/src']) {
    files.push(...fs.readdirSync(path.resolve(root, dir)).filter(f => f.endsWith('.js')).map(f => dir + '/' + f));
  }
  await require('../../../scripts/bench-paired.cjs').run({root, upstream, vpm, cases, files});
})().catch(error => { console.error(error); process.exitCode = 1; });
