'use strict';
const compare = require('../../../scripts/compare.cjs');
const parse = require('..');
const before = require('../test/fixtures/range-parser-1.2.1.cjs');
function consume(parser, input) {
  const result = parser(10000, input.value, { combine: input.combine });
  if (typeof result === 'number') return result;
  let sum = result.length;
  for (const range of result) sum += range.start + range.end;
  return sum;
}
compare([
  ['closed range', { value: 'bytes=0-499' }],
  ['open range', { value: 'bytes=9500-' }],
  ['suffix', { value: 'bytes=-500' }],
  ['8 separate ranges', { value: Array.from({ length: 8 }, (_, i) => i * 100 + '-' + (i * 100 + 49)).join(','), combine: true }],
  ['8 overlapping ranges', { value: Array.from({ length: 8 }, (_, i) => i * 100 + '-' + (i * 100 + 149)).join(','), combine: true }],
].map(([name, input]) => {
  if (!input.value.startsWith('bytes=')) input.value = 'bytes=' + input.value;
  return { name, inputs: [input], before: value => consume(before, value), after: value => consume(parse, value) };
}));
