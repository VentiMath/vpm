"use strict";
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {createRequire, wrap} = require('node:module');
const file = path.join(path.dirname(require.resolve('./node_modules/notistack')), 'notistack.cjs.development.js');
// Execute the caller unchanged with only its Goober import substituted.
const factory = vm.runInThisContext(wrap(fs.readFileSync(file, 'utf8')), {filename:file});
function loadCaller(api) {
  const local = createRequire(file), calls = [], module = {exports:{}};
  const injected = name => name !== 'goober' ? local(name) : new Proxy(api, {
    get(target, key) {
      if (key !== 'css') throw Error('Unexpected Goober API in Notistack: ' + String(key));
      return (...styles) => { const name = api.css(...styles); calls.push({styles,name}); return name; };
    },
  });
  factory(module.exports, injected, module, file, path.dirname(file));
  return { caller:module.exports, calls };
}
module.exports = { loadCaller };
