'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const safer = require('./fixtures/safer-buffer-2.1.2.cjs');
const directory = path.join(__dirname, 'fixtures/iconv-lite-0.7.3');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const module = { exports: {} };
  cache.set(file, module);
  vm.compileFunction(fs.readFileSync(file, 'utf8'), ['require', 'module', 'exports'], { filename: file })(name => {
    if (name === 'safer-buffer') return safer;
    if (['buffer', 'stream', 'string_decoder'].includes(name)) return require('node:' + name);
    if (!name.startsWith('.')) throw new Error('Unexpected dependency: ' + name);
    let child = path.resolve(path.dirname(file), name);
    if (!path.extname(child)) child += fs.existsSync(child) && fs.statSync(child).isDirectory() ? '/index.js' : '.js';
    return load(child);
  }, module, module.exports);
  return module.exports;
}
module.exports = load(path.join(directory, 'lib/index.js'));
