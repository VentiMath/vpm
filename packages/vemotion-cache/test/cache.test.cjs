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

test('server compilation keys include the actual selector and styles, not only a supplied name', async () => {
  const {default: createCache} = await load();
  const cache = createCache({key: 'collision'});
  assert.equal(cache.insert('.first', {name: 'same', styles: 'color:red;'}, cache.sheet, false), '.first{color:red;}');
  assert.equal(cache.insert('.second', {name: 'same', styles: 'color:blue;'}, cache.sheet, false), '.second{color:blue;}');
  assert.equal(cache.insert('.third', {name: '__proto__', styles: 'width:0;'}, cache.sheet, true), '.third{width:0;}');
  assert.equal(cache.inserted.__proto__, true);
  assert.equal(cache.registered.toString, undefined);
  assert.equal(cache.inserted.hasOwnProperty('__proto__'), true);
  assert.equal(cache.inserted.hasOwnProperty('toString'), false);
});

test('compiled custom-plugin rules are bounded without dropping inserted CSS', async () => {
  const {default: createCache} = await load();
  let compilations = 0;
  const cache = createCache({key: 'bounded', stylisPlugins: [element => {if (element.type === 'decl') compilations++;}]});
  cache.compat = true;
  const first = {name: 'first', styles: 'width:0;'};
  cache.insert('.first', first, cache.sheet, true);
  cache.insert('.first', first, cache.sheet, false);
  assert.equal(compilations, 1);
  for (let i = 0; i < 1024; i++) cache.insert('.other', {name: 'other' + i, styles: `height:${i}px;`}, cache.sheet, false);
  assert.equal(cache.insert('.first', first, cache.sheet, false), '.first{width:0;}');
  assert.equal(compilations, 1026, 'the oldest compiled entry was evicted and recompiled');
  assert.equal(cache.inserted.first, '.first{width:0;}', 'legacy renderer still has already-inserted CSS');
});

test('custom-plugin compilation does not leak across request caches', async () => {
  const {default: createCache} = await load();
  let color = 'red';
  const plugins = [element => {if (element.type === 'decl') element.return = 'color:' + color + ';';}];
  const first = createCache({key: 'request', stylisPlugins: plugins});
  assert.equal(first.insert('.x', {name: 'same', styles: 'color:inherit;'}, first.sheet, false), '.x{color:red;}');
  color = 'blue';
  const second = createCache({key: 'request', stylisPlugins: plugins});
  assert.equal(second.insert('.x', {name: 'same', styles: 'color:inherit;'}, second.sheet, false), '.x{color:blue;}');
});

test('nested browser insertions keep their sheet, and hydration uses the container document', () => {
  const {spawnSync} = require('node:child_process');
  const fixture = path.resolve(__dirname, '../../../scripts/emotion-conformance/node_modules');
  const source = `
    const {JSDOM} = require(${JSON.stringify(path.join(fixture, 'jsdom'))});
    const dom = new JSDOM('<!doctype html><head></head><body></body>');
    global.document = dom.window.document; global.HTMLElement = dom.window.HTMLElement;
    const createCache = require(process.argv[1]).default;
    const outer = [], inner = [];
    let nested = false, cache;
    const plugin = element => {
      if (element.type === 'decl' && !nested) {
        nested = true;
        cache.insert('.inner', {name: 'inner', styles: 'width:1px;'}, {insert: value => inner.push(value)}, false);
      }
    };
    cache = createCache({key: 'app', stylisPlugins: [plugin]});
    cache.insert('.outer', {name: 'outer', styles: 'color:red;background:blue;'}, {insert: value => outer.push(value)}, false);
    const frame = new JSDOM('<!doctype html><head><style data-emotion="frame existing">body{color:red;}</style></head><body></body>');
    const scoped = createCache({key: 'frame', container: frame.window.document.head});
    process.stdout.write(JSON.stringify({outer, inner, hydrated: scoped.inserted.existing === true, tags: scoped.sheet.tags.length}));
    dom.window.close(); frame.window.close();
  `;
  const run = root => {
    const result = spawnSync(process.execPath, ['-e', source, root], {encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout);
  };
  const original = run(path.join(fixture, '@emotion/cache'));
  assert.equal(original.outer.length, 0, 'control reproduces shared insertion destination');
  assert.equal(original.inner.length, 2);
  assert.equal(original.hydrated, false);
  const actual = run(path.resolve(__dirname, '..'));
  assert.deepEqual(actual, {outer: ['.outer{color:red;background:blue;}'], inner: ['.inner{width:1px;}'], hydrated: true, tags: 1});
});
