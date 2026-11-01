'use strict';
// Defects in Emotion 11.14's packages, reproduced with the pinned originals
// and checked in VPM's.
const assert = require('node:assert/strict'), path = require('node:path'), {pathToFileURL} = require('node:url');
const packages = path.resolve(__dirname, '../../packages');
const load = async name => (await import(pathToFileURL(path.join(packages, name, 'index.js')).href)).default;

(async () => {
  const {serializeStyles} = require('./node_modules/@emotion/serialize');
  const found = [];

  // 1. @emotion/hash keeps only each UTF-16 code unit's low byte, so styles
  // that differ by characters with the same low byte (中 U+4E2D, 伭 U+4F2D)
  // get the same class name: the second component renders the first's styles.
  const first = serializeStyles([{'&::before': {content: '"中"'}}]), second = serializeStyles([{'&::before': {content: '"伭"'}}]);
  assert.notEqual(first.styles, second.styles);
  assert.equal(first.name, second.name);
  const hash = await load('vemotion-hash');
  assert.notEqual(hash(first.styles), hash(second.styles));
  assert.equal(hash('something'), require('./node_modules/@emotion/hash').default('something'));
  found.push(`two styles differing by 中/伭 share class css-${first.name}`);

  // 2. @emotion/unitless lacks gridArea and lineClamp, which take numbers.
  assert.equal(serializeStyles([{gridArea: 2, lineClamp: 3}]).styles, 'grid-area:2px;line-clamp:3px;');
  const unitless = await load('vemotion-unitless');
  assert.deepEqual([unitless.gridArea, unitless.lineClamp], [1, 1]);
  found.push('gridArea: 2 and lineClamp: 3 serialized with px');

  // 3. @emotion/memoize recomputes undefined results on every call.
  const original = require('./node_modules/@emotion/memoize').default, memoize = await load('vemotion-memoize');
  for (const [library, expected] of [[original, 2], [memoize, 1]]) {
    let calls = 0;
    const nothing = library(() => { calls++; });
    nothing('a');
    nothing('a');
    assert.equal(calls, expected);
  }
  found.push('undefined results recomputed by memoize');

  console.log(`Reproduced in Emotion 11.14 and fixed (${found.length}):\n- ${found.join('\n- ')}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
