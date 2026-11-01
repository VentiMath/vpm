'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');

const load = () => import(path.join(__dirname, '../index.js'));
const prefixed = async css => {
  const {compile, serialize, middleware, prefixer, stringify} = await load();
  return serialize(compile(css), middleware([prefixer, stringify]));
};

test('exports and package metadata', async () => {
  const api = await load();
  for (const name of ['compile', 'serialize', 'stringify', 'middleware', 'rulesheet', 'prefixer', 'namespace', 'prefix', 'tokenize', 'node', 'copy', 'lift', 'strlen']) assert.equal(typeof api[name], 'function', name);
  assert.equal(api.RULESET, 'rule');
  assert.equal(api.SCOPE, '@scope');
  // require() loads the ES module on Node.js 24 and Bun.
  assert.equal(require('../index.js').compile, api.compile);
  const metadata = require('../package.json');
  assert.equal(metadata.type, 'module');
  assert.equal(metadata.dependencies, undefined);
});

test('nesting, & and conditional at-rules inside rules', async () => {
  const {compile, serialize, stringify} = await load();
  assert.equal(
    serialize(compile('.a{color:red;&:hover,.b &{color:blue;}@media (min-width:1px){color:green;.c{width:0;}}}'), stringify),
    '.a{color:red;}.a:hover,.b .a{color:blue;}@media (min-width:1px){.a{color:green;}.a .c{width:0;}}',
  );
});

test('prefixes the properties it knows by name, and no others', async () => {
  // stylis 4.4.0 picks properties by a hash of the name's length and first
  // four characters, which these share with prefixed properties.
  for (const declaration of ['flex-wrap:wrap;', 'flex-flow:row wrap;', 'grid-gap:8px;', 'grid-column-gap:8px;', 'grid-auto-flow:column;', 'scroll-padding-top:4px;', 'scroll-snap-align:start;', 'color-scheme:dark;', 'translate:10px;', 'background-position:center;', 'text-orientation:mixed;']) {
    assert.equal(await prefixed(`.a{${declaration}}`), `.a{${declaration}}`, declaration);
  }
  assert.equal(await prefixed('.a{display:flex;user-select:none;}'), '.a{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;}');
  assert.equal(await prefixed('.a{backdrop-filter:blur(2px);}'), '.a{-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);}');
});

test('IE grid spans pair a start line with the end line of its own axis', async () => {
  assert.equal(await prefixed('.a{grid-auto-rows:100px;grid-row-end:3;}'), '.a{grid-auto-rows:100px;-ms-grid-row-span:3;grid-row-end:3;}');
  assert.equal(await prefixed('.a{grid-column-start:1;grid-column-end:3;}'), '.a{-ms-grid-column:1;grid-column-start:1;-ms-grid-column-span:2;grid-column-end:3;}');
  assert.equal(await prefixed('.a{grid-row-start:2;grid-row-end:5;}'), '.a{-ms-grid-row:2;grid-row-start:2;-ms-grid-row-span:3;grid-row-end:5;}');
});

test('mask-composite maps each standard keyword to its -webkit- keyword', async () => {
  assert.equal(await prefixed('.a{mask-composite:subtract;}'), '.a{-webkit-mask-composite:source-out;mask-composite:subtract;}');
  assert.equal(await prefixed('.a{mask-composite:add, exclude, add;}'), '.a{-webkit-mask-composite:source-over,xor,source-over;mask-composite:add,exclude,add;}');
});

test('a declaration\'s property ends at its first colon', async () => {
  const {compile, serialize, stringify} = await load();
  const [custom, spaced] = compile('--x: a:b; transform :a:b;');
  assert.deepEqual([custom.props, custom.children, custom.length], ['--x', 'a:b', 3]);
  assert.deepEqual([spaced.value, spaced.props, spaced.children], ['transform:a:b;', 'transform', 'a:b']);
  assert.equal(serialize(compile('.a{--x:{a:b};--y:;}'), stringify), '.a{--x:{a:b};--y:;}');
});

test('a comment at the end of the input keeps its text', async () => {
  const {compile} = await load();
  assert.deepEqual(compile('a{}// note').map(element => element.value).slice(-1), ['/* note*/']);
  assert.deepEqual(compile('/* open').map(element => element.children), [' open']);
});

test('::placeholder forms become rules of their own, inside their at-rules', async () => {
  const {compile, serialize, middleware, prefixer, stringify, rulesheet} = await load();
  const rules = [];
  serialize(compile('@media (min-width:1px){.a::placeholder,.b{color:red;}}'), middleware([prefixer, stringify, rulesheet(rule => rules.push(rule))]));
  assert.deepEqual(rules, [
    '@media (min-width:1px){.b{color:red;}}',
    '@media (min-width:1px){.a::-webkit-input-placeholder{color:red;}}',
    '@media (min-width:1px){.a::-moz-placeholder{color:red;}}',
    '@media (min-width:1px){.a:-ms-input-placeholder{color:red;}}',
    '@media (min-width:1px){.a::placeholder{color:red;}}',
  ]);
});
