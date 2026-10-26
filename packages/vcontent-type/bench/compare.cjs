'use strict';
const assert = require('node:assert/strict');
const compare = require('../../../scripts/compare.cjs');
const after = require('..');
const before = require(process.argv[2] === 'latest' ? '../test/fixtures/content-type-3.1.1.cjs' : '../test/fixtures/content-type-2.1.0.cjs');
console.log('Baseline: content-type ' + (process.argv[2] === 'latest' ? '3.1.1' : '2.1.0'));
function consume(result) {
  let sum = result.type.length + result.index;
  for (const key of Object.keys(result.parameters)) sum += key.length + result.parameters[key].length;
  return sum;
}
const cases = [
  ['type only', 'application/json'],
  ['charset', 'text/html; charset=utf-8'],
  ['mixed case', ' Text/HTML; Charset="UTF-8"; Boundary=example '],
  ['type-is shortcut', 'application/json; charset=utf-8', { parameters: false }],
  ['quoted parameter', 'text/html; profile="compact,print"; charset=utf-8'],
  ['4 KiB quoted value', 'text/plain; note="' + 'abc '.repeat(1024) + '"'],
  ['escaped quoted value', 'text/plain; note="' + 'abc\\" def\\\\ '.repeat(64) + '"'],
  ['duplicate quoted value', 'text/plain; note=first; note="' + 'abc '.repeat(1024) + '"'],
  ['Accept item', 'text/html; profile="a,b";q=0.8, application/json;q=0.9', { comma: true }],
].map(([name, header, options]) => {
  assert.deepEqual({ ...after.parse(header, options), parameters: { ...after.parse(header, options).parameters } },
    { ...before.parse(header, options), parameters: { ...before.parse(header, options).parameters } });
  return { name, inputs: [header], before: input => consume(before.parse(input, options)), after: input => consume(after.parse(input, options)) };
});
for (const [name, input] of [
  ['format type', { type: 'application/json' }],
  ['format charset', { type: 'text/html', parameters: { charset: 'utf-8' } }],
  ['format quoted', { type: 'text/plain', parameters: { note: 'a "quoted" value \\ with space' } }],
]) cases.push({ name, inputs: [input], before: before.format, after: after.format });
compare(cases);
