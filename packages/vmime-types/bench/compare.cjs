'use strict';
const compare = require('../../../scripts/compare.cjs');
const before = require('../test/upstream.cjs');
const after = require('..');
compare([
  ['lookup extension', 'lookup', ['html', 'json', 'js', 'css', 'png', 'wasm']],
  ['lookup dotted extension', 'lookup', ['.HTML', '.json', '.css', '.png']],
  ['lookup path', 'lookup', ['/static/assets/index.html', '/a/b/file.json', '/a/file.png', '/unknown.ext']],
  ['header from extension', 'contentType', ['html', 'json', 'js', 'css', 'png', 'wasm']],
  ['header from type', 'contentType', ['text/html', 'application/json', 'text/javascript', 'image/png']],
  ['header with parameters', 'contentType', ['text/html; foo=bar', 'text/plain; charset=ascii', 'text/html; note="one; two"']],
  ['default charset', 'charset', ['text/html', 'application/json', 'image/png', 'TEXT/HTML']],
  ['default extension', 'extension', ['text/html', 'application/json', 'image/png', 'TEXT/HTML']],
].map(([name, method, inputs]) => ({ name, inputs, before: before[method], after: after[method] })));
