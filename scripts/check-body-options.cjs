'use strict';
// Compare construction against the independently installed, locked upstream
// dependency tree, without substituting any VPM primitives into that control.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const from = createRequire(require.resolve('./consumers/package.json'));
const upstream = from('body-parser');
const vpm = require('../packages/vbody-parser');
assert.equal(from('body-parser/package.json').version, '2.4.0');

const values = [
  ['undefined', undefined], ['null', null], ['false', false], ['true', true],
  ['zero', 0], ['one', 1], ['negative', -1], ['fraction', 0.5], ['decimal', 2.9],
  ['int32', 2 ** 31], ['uint32', 2 ** 32], ['max-safe', Number.MAX_SAFE_INTEGER],
  ['infinity', Infinity], ['negative-infinity', -Infinity], ['NaN', NaN],
  ['empty', ''], ['zero-string', '0'], ['one-string', '1'], ['count-string', '1000'],
  ['size', '100kb'], ['partial-size', '100kbjunk'], ['exponent', '1e3'],
  ['utf8', 'utf-8'], ['uppercase-utf8', 'UTF-8'], ['utf16', 'utf-16'],
  ['latin1', 'iso-8859-1'], ['unknown-charset', 'not-a-charset'],
  ['empty-array', []], ['type-array', ['json']], ['mixed-types', ['json', 'text/@']],
  ['object', {}], ['predicate', () => true], ['callback', () => {}], ['regex', /json/],
];
const options = ['limit', 'inflate', 'type', 'verify', 'defaultCharset', 'strict',
  'reviver', 'extended', 'parameterLimit', 'depth', 'charsetSentinel', 'interpretNumericEntities'];

// Explicitly enumerate intentional differences. Do not infer these from either
// implementation's validators: a new mismatch must fail this gate for review.
const invalidLimits = new Set(['negative', 'negative-infinity', 'partial-size', 'exponent']);
const invalidCharsets = new Set([
  'true', 'one', 'negative', 'fraction', 'decimal', 'int32', 'uint32', 'max-safe',
  'infinity', 'negative-infinity', 'zero-string', 'one-string', 'count-string',
  'size', 'partial-size', 'exponent', 'unknown-charset', 'empty-array', 'type-array',
  'mixed-types', 'object', 'predicate', 'callback', 'regex',
]);
function exception(kind, option, label) {
  if (option === 'limit' && invalidLimits.has(label)) return [true, false];
  if (option !== 'defaultCharset') return;
  if (kind === 'json' && label === 'latin1') return [true, false];
  if ((kind === 'json' || kind === 'text') && invalidCharsets.has(label)) return [true, false];
  // Charset labels are case-insensitive; VPM normalizes the configured default.
  if (kind === 'urlencoded' && label === 'uppercase-utf8') return [false, true];
}
function accepts(factory, config) {
  let middleware;
  try { middleware = factory(config); } catch { return false; }
  assert.equal(typeof middleware, 'function', 'factory must return middleware');
  return true;
}
let checked = 0, differences = 0;
function compare(kind, option, label, value, extra = {}) {
  const config = { ...extra, [option]: value };
  const outcomes = [accepts(upstream[kind], config), accepts(vpm[kind], config)];
  const expected = exception(kind, option, label);
  const name = `${kind}: ${option}=${label}${extra.extended ? ' (extended)' : ''}`;
  if (expected) { assert.deepEqual(outcomes, expected, name); differences++; }
  else assert.equal(outcomes[1], outcomes[0], name);
  checked++;
}
for (const kind of ['json', 'raw', 'text', 'urlencoded']) {
  for (const option of options) for (const [label, value] of values) compare(kind, option, label, value);
}
assert.equal(checked, 1632);
// depth is ignored unless extended is enabled, so exercise that branch too.
for (const [label, value] of values) compare('urlencoded', 'depth', label, value, { extended: true });
assert.equal(checked, 1666);
assert.equal(differences, 66);
console.log(`${checked} body-parser construction comparisons: 1600 match, 66 explicit differences (65 early rejections, 1 case-insensitive charset).`);
