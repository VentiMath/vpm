'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const load = async () => (await import(path.join(__dirname, '../index.js'))).default;

test('properties whose numbers take no unit', async () => {
  const unitless = await load();
  for (const key of ['lineHeight', 'zIndex', 'opacity', 'flexGrow', 'fontWeight', 'scale', 'WebkitLineClamp', 'strokeWidth', 'aspectRatio']) assert.equal(unitless[key], 1, key);
  for (const key of ['width', 'fontSize', 'margin', 'gridTemplateColumns']) assert.equal(unitless[key], undefined, key);
});

test('includes grid-area and line-clamp, as React does', async () => {
  // @emotion/unitless 0.10.0 lacks both, so gridArea: 2 became grid-area:2px.
  const unitless = await load();
  assert.equal(unitless.gridArea, 1);
  assert.equal(unitless.lineClamp, 1);
  assert.equal(Object.keys(unitless).length, 49);
});
