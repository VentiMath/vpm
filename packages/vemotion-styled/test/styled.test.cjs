'use strict';
// React is a peer the workspace does not install; Emotion's suite (scripts/
// emotion-conformance) covers the components. These cover prop forwarding.
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');

test('DOM elements get DOM attributes; components get every prop but the theme', async () => {
  const {elementFilter, StyleDefinition} = await import(path.join(__dirname, '../src/definition.js'));
  const toDiv = elementFilter('div'), toComponent = elementFilter(function Card() {});
  assert.deepEqual(['href', 'onClick', 'variant', 'theme', 'as', 'commandFor'].map(toDiv), [true, true, false, false, false, true]);
  assert.deepEqual(['variant', 'theme', 'as'].map(toComponent), [true, false, true]);
  // An upper-case string tag is a component name, not an element.
  assert.equal(elementFilter('Custom')('variant'), true);
  const base = function Card() {};
  base.__emotion_real = base;
  base.__emotion_forwardProp = prop => prop !== 'secret';
  const composed = new StyleDefinition(base, {shouldForwardProp: prop => prop !== 'color'}).forward;
  assert.deepEqual(['secret', 'color', 'id'].map(composed), [false, false, true]);
  assert.equal(new StyleDefinition(base).filter, base.__emotion_forwardProp);
  assert.equal(new StyleDefinition('div').filter, undefined);
  const Custom = function Custom() {};
  const result = new StyleDefinition('div', false).destination({as: Custom, variant: 'solid', theme: {}});
  assert.equal(result.element, Custom);
  assert.deepEqual(result.forwarded, {variant: 'solid'});
});

test('a shorthand for each HTML and SVG element', async () => {
  const {tags} = await import(path.join(__dirname, '../src/tags.js'));
  assert.equal(tags.length, 134);
  for (const tag of ['div', 'h1', 'h6', 'svg', 'foreignObject', 'tspan', 'button']) assert.ok(tags.includes(tag), tag);
});
