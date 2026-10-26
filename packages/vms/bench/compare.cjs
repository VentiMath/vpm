'use strict';
const compare = require('../../../scripts/compare.cjs');
const upstream = require('../test/fixtures/ms-2.1.3.cjs');
const replacement = require('..');
const numbers = Array.from({ length: 32 }, (_, i) => i * 123456.25);
compare([
  { name: 'parse compact duration', before: upstream, after: replacement, inputs: numbers.map(n => n + 'ms') },
  { name: 'parse words', before: upstream, after: replacement, inputs: Array.from({ length: 32 }, (_, i) => (i + .25) + ' hours') },
  { name: 'parse bare number', before: upstream, after: replacement, inputs: numbers.map(String) },
  { name: 'format milliseconds', before: upstream, after: replacement, inputs: Array.from({ length: 32 }, (_, i) => i * 27) },
  { name: 'format short', before: upstream, after: replacement, inputs: numbers },
  { name: 'format long', before: n => upstream(n, { long: true }), after: n => replacement(n, { long: true }), inputs: numbers },
]);
