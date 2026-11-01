'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const load = async () => (await import(path.join(__dirname, '../index.js'))).serializeStyles;
const template = (strings, ...values) => [strings, ...values];

test('objects, nesting, units, fallbacks and labels', async () => {
  const serialize = await load();
  const result = serialize([{color: 'red', width: 10, zIndex: 2, msTransform: 'none', '--gap': 4, '&:hover': {opacity: 0.5}, display: ['-webkit-box', 'flex'], label: 'Card'}]);
  assert.equal(result.styles, 'color:red;width:10px;z-index:2;-ms-transform:none;--gap:4;&:hover{opacity:0.5;}display:-webkit-box;display:flex;label:Card;');
  assert.match(result.name, /^[0-9a-z]+-Card$/);
  assert.equal(serialize([result]), result); // already serialized
});

test('templates, functions of props, registered class names and keyframes', async () => {
  const serialize = await load();
  const fade = {name: 'fade', styles: '@keyframes fade{from{opacity:0;}}', anim: 1, toString: () => '_EMO_fade_@keyframes fade{from{opacity:0;}}_EMO_'};
  const result = serialize(template`color:${props => props.tone};animation:${fade} 1s;${'css-abc'}`, {'css-abc': 'margin:0;'}, {tone: 'blue'});
  assert.equal(result.styles, 'color:blue;animation:fade 1s;margin:0;');
  assert.deepEqual(result.next, {name: 'fade', styles: '@keyframes fade{from{opacity:0;}}', next: undefined});
  // Keyframes embedded in an animation string are collected too.
  assert.equal(serialize([{animation: `${fade} 2s`}]).next.name, 'fade');
});

test('unitless properties in kebab-case take no px; numeric fallback lists', async () => {
  const serialize = await load();
  assert.equal(serialize([{'font-weight': 600, 'line-height': 1.5, 'z-index': 2, gridArea: 2}]).styles, 'font-weight:600;line-height:1.5;z-index:2;grid-area:2;');
  assert.equal(serialize([{width: [100, '50%']}]).styles, 'width:100px;width:50%;');
});

test('each call collects only its own keyframes (nested calls in functions)', async () => {
  const serialize = await load();
  const inner = {name: 'inner', styles: '@keyframes inner{}', anim: 1, toString: () => 'inner'};
  const outer = {name: 'outer', styles: '@keyframes outer{}', anim: 1, toString: () => 'outer'};
  const result = serialize([{animationName: outer}, () => serialize([{animationName: inner}])], undefined, {});
  const names = [];
  for (let next = result.next; next; next = next.next) names.push(next.name);
  assert.deepEqual(names, ['inner', 'outer']);
});
