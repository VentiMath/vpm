'use strict';
// Defects in stylis 4.4.0, reproduced with the pinned original and checked
// in vstylis.
const assert = require('node:assert/strict'), path = require('node:path'), {pathToFileURL} = require('node:url');
const bun = typeof Bun !== 'undefined';

(async () => {
  const upstream = await import(pathToFileURL(path.join(__dirname, 'node_modules/stylis/index.js')).href);
  const vpm = await import(pathToFileURL(path.resolve(__dirname, '../../packages/vstylis/index.js')).href);
  const prefixed = (library, css) => library.serialize(library.compile(css), library.middleware([library.prefixer, library.stringify]));
  const found = [];

  // 1. The prefixer selects properties by a hash of the name's length and
  // first four characters; properties sharing a hash with a prefixed one get
  // invented declarations.
  const invented = {
    'flex-wrap:wrap;': '-webkit-box-flex-wrap:wrap;',
    'grid-gap:8px;': '-ms-grid-gap:8px;',
    'scroll-padding-top:4px;': 'scroll-snap-padding-top:4px;',
    'translate:10px;': '-webkit-translate:10px;',
    'color-scheme:dark;': '-webkit-print-color-scheme:dark;',
  };
  for (const [declaration, bogus] of Object.entries(invented)) {
    assert.ok(prefixed(upstream, `.a{${declaration}}`).includes(bogus), declaration);
    assert.equal(prefixed(vpm, `.a{${declaration}}`), `.a{${declaration}}`);
  }
  // ...including a negative IE span from grid-auto-rows (hashed as grid-row-start).
  assert.ok(prefixed(upstream, '.a{grid-auto-rows:100px;grid-row-end:3;}').includes('-ms-grid-row-span:-97;'));
  assert.equal(prefixed(vpm, '.a{grid-auto-rows:100px;grid-row-end:3;}'), '.a{grid-auto-rows:100px;-ms-grid-row-span:3;grid-row-end:3;}');
  found.push(`invented declarations for properties that are not prefixed (${Object.keys(invented).length} shown, and -ms-grid-row-span:-97)`);

  // 2. A column's IE span is written as a row span.
  assert.equal(prefixed(upstream, '.a{grid-column-start:1;grid-column-end:3;}'), '.a{-ms-grid-column:1;grid-column-start:1;-ms-grid-row-span:2;grid-column-end:3;}');
  assert.equal(prefixed(vpm, '.a{grid-column-start:1;grid-column-end:3;}'), '.a{-ms-grid-column:1;grid-column-start:1;-ms-grid-column-span:2;grid-column-end:3;}');
  found.push('a column span written as -ms-grid-row-span');

  // 3. mask-composite: subtract is looked up as "substract", and only the
  // first layer's keyword is converted.
  assert.equal(prefixed(upstream, '.a{mask-composite:subtract;}'), '.a{-webkit-mask-composite:subtract;mask-composite:subtract;}');
  assert.equal(prefixed(upstream, '.a{mask-composite:add,add;}'), '.a{-webkit-mask-composite:source-over,add;mask-composite:add,add;}');
  assert.equal(prefixed(vpm, '.a{mask-composite:subtract;}'), '.a{-webkit-mask-composite:source-out;mask-composite:subtract;}');
  assert.equal(prefixed(vpm, '.a{mask-composite:add,add;}'), '.a{-webkit-mask-composite:source-over,source-over;mask-composite:add,add;}');
  found.push('mask-composite: subtract and later layers left unconverted for -webkit-');

  // 4. A declaration's property ends at the last colon.
  const [custom, spaced] = upstream.compile('--x: a:b; transform :a:b;');
  assert.deepEqual([custom.props, custom.children], ['--x:a', 'b']);
  assert.deepEqual([spaced.value, spaced.props], ['transform :a:b;', 'transform :a']);
  const [vpmCustom, vpmSpaced] = vpm.compile('--x: a:b; transform :a:b;');
  assert.deepEqual([vpmCustom.props, vpmCustom.children, vpmSpaced.value, vpmSpaced.props], ['--x', 'a:b', 'transform:a:b;', 'transform']);
  found.push('a declaration with a colon in its value split at that colon');

  // 5. A comment at the end of the input loses its last character (or gains
  // a NUL).
  assert.equal(upstream.compile('a{}// note').at(-1).value, '/* not*/');
  assert.equal(upstream.compile('/* open').at(-1).value, '/* ope*\0');
  assert.equal(vpm.compile('a{}// note').at(-1).value, '/* note*/');
  assert.equal(vpm.compile('/* open').at(-1).value, '/* open*/');
  found.push('a comment at the end of the input truncated');

  // 6. namespace switches on a variable that one case label assigns;
  // JavaScriptCore (Bun, Safari) compares the label with the assigned value,
  // so the result depends on the engine.
  const scoped = library => library.serialize(library.compile('.scope{a:not([href]){color:red;}}'), library.middleware([library.namespace, library.stringify]));
  assert.equal(scoped(upstream), bun ? 'a.scope:not.scope([href]){color:red;}' : 'a.scope:not([href]){color:red;}');
  assert.equal(scoped(vpm), 'a.scope:not([href]){color:red;}');
  found.push(bun ? 'namespace scoping a:not(...) as a.scope:not.scope(...) on JavaScriptCore' : 'namespace output that differs on JavaScriptCore (reproduced under Bun)');

  console.log(`Reproduced in stylis 4.4.0 and fixed (${found.length}):\n- ${found.join('\n- ')}`);
})().catch(error => { console.error(error); process.exitCode = 1; });
