'use strict';
// Without a document the cache behaves as on the server: insert returns the CSS.
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const load = async () => import(path.join(__dirname, '../index.js'));
let id = 0;
const insert = (cache, styles, selector = '.css-x') => cache.insert(selector, {name: 'n' + id++, styles}, cache.sheet, true);

test('compiles nested styles with Emotion\'s plugins', async () => {
  const {default: createCache} = await load();
  const cache = createCache({key: 'css'});
  assert.equal(insert(cache, 'color:red;label:Card;:hover{color:blue;}& .child,:focus{width:0;}@media (min-width:1px){display:flex;}'),
    '.css-x{color:red;}.css-x:hover{color:blue;}.css-x .child,.css-x:focus{width:0;}@media (min-width:1px){.css-x{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;}}');
  assert.equal(cache.key, 'css');
  assert.ok(Object.values(cache.inserted).every(value => value === true));
});

test('prefixes by property name, with Emotion\'s rules', async () => {
  const {default: createCache} = await load();
  const cache = createCache({key: 'css'});
  assert.equal(insert(cache, 'flex-wrap:wrap;color-scheme:dark;grid-template-columns:1fr;'), '.css-x{flex-wrap:wrap;color-scheme:dark;grid-template-columns:1fr;}');
  assert.equal(insert(cache, 'justify-content:space-between;'), '.css-x{-webkit-box-pack:justify;-ms-flex-pack:justify;-webkit-justify-content:space-between;justify-content:space-between;}');
  assert.equal(insert(cache, 'align-self:flex-start;'), '.css-x{-webkit-align-self:flex-start;-ms-flex-item-align:start;align-self:flex-start;}');
  assert.equal(insert(cache, '&::placeholder{color:gray;}'), '.css-x::-webkit-input-placeholder{color:gray;}.css-x::-moz-placeholder{color:gray;}.css-x:-ms-input-placeholder{color:gray;}.css-x::placeholder{color:gray;}');
  assert.equal(insert(cache, '@keyframes spin{to{transform:rotate(1turn);}}', ''), '@-webkit-keyframes spin{to{-webkit-transform:rotate(1turn);-moz-transform:rotate(1turn);-ms-transform:rotate(1turn);transform:rotate(1turn);}}@keyframes spin{to{-webkit-transform:rotate(1turn);-moz-transform:rotate(1turn);-ms-transform:rotate(1turn);transform:rotate(1turn);}}');
});

test('custom plugins, compat mode and shared server rules', async () => {
  const {default: createCache, prefixer} = await load();
  assert.equal(typeof prefixer, 'function');
  const upper = element => { if (element.type === 'decl') element.return = element.value.toUpperCase(); };
  const cache = createCache({key: 'app', stylisPlugins: [upper]});
  assert.equal(insert(cache, 'color:red;'), '.css-x{COLOR:RED;}');
  const compat = createCache({key: 'compat'});
  compat.compat = true;
  const name = 'shared' + id++;
  assert.equal(compat.insert('.compat-a', {name, styles: 'width:0;'}, compat.sheet, true), undefined);
  assert.equal(compat.inserted[name], '.compat-a{width:0;}');
});
