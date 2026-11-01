'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const load = () => import(path.join(__dirname, '../index.js'));
const fakeCache = () => {
  const inserted = [];
  const cache = {key: 'css', inserted: {}, registered: {}, sheet: {}, insert: (selector, serialized, sheet, shouldCache) => {
    inserted.push([selector, serialized.name, shouldCache]);
    if (shouldCache) cache.inserted[serialized.name] = true;
    return `${selector || ''}{${serialized.styles}}`;
  }};
  return {cache, inserted};
};

test('getRegisteredStyles splits registered styles from other class names', async () => {
  const {getRegisteredStyles} = await load();
  const styles = [];
  assert.equal(getRegisteredStyles({'css-1': 'color:red', 'css-2': 'width:0'}, styles, 'a css-1  b css-2'), 'a b ');
  assert.deepEqual(styles, ['color:red;', 'width:0;']);
});

test('insertStyles registers non-string-tag styles and inserts each chain once', async () => {
  const {insertStyles} = await load();
  const {cache, inserted} = fakeCache();
  const keyframes = {name: 'k', styles: '@keyframes k{}'};
  const serialized = {name: 'abc', styles: 'color:red;', next: keyframes};
  // No document in Node: the inserted CSS is returned for server rendering.
  assert.equal(insertStyles(cache, serialized, false), '.css-abc{color:red;}{@keyframes k{}}');
  assert.equal(insertStyles(cache, serialized, false), undefined);
  assert.deepEqual(inserted, [['.css-abc', 'abc', true], ['', 'k', true]]);
  assert.equal(cache.registered['css-abc'], 'color:red;');
  insertStyles(cache, {name: 'str', styles: 'width:0;'}, true);
  assert.equal(cache.registered['css-str'], undefined);
  cache.compat = true;
  insertStyles(cache, {name: 'compat', styles: 'width:1px;'}, true);
  assert.equal(cache.registered['css-compat'], 'width:1px;');
});
