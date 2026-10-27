'use strict';
const upstream = require('../test/fixtures/bytes-3.1.2.cjs');
const vpm = require('..');
const compare = require('../../../scripts/compare.cjs');
const cases = [
  { name: 'parse numeric', inputs: [1024, 102400, 10485760], before: upstream.parse, after: vpm.parse },
  { name: 'parse bare integers', inputs: ['0', '102400', '10485760'], before: upstream.parse, after: vpm.parse },
  { name: 'parse body limits', inputs: ['100kb', '1mb', '10mb', '5MB'], before: upstream.parse, after: vpm.parse },
  { name: 'parse decimal units', inputs: ['1.5kb', '2.25mb', '-1.125gb'], before: upstream.parse, after: vpm.parse },
  { name: 'parse decimal PB', inputs: ['1.5pb', '2.25pb'], before: upstream.parse, after: vpm.parse },
];
for (const [name, options] of [
  ['format defaults', undefined], ['format fixed', { fixedDecimals: true, decimalPlaces: 4 }],
  ['format unit', { unit: 'kb', unitSeparator: ' ' }], ['format grouping', { unit: 'B', thousandsSeparator: ',' }],
]) cases.push({ name, inputs: [0, 1024, 1234567, -1234567], before: value => upstream.format(value, options), after: value => vpm.format(value, options) });
compare(cases);
