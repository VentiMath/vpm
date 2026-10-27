'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { isBuiltin } = require('node:module');
const root = path.join(__dirname, 'fixtures/upstream');
const cache = new Map();

// Run the published CommonJS sources with their real, pinned dependencies.
// Resolve inside the fixture rather than depending on an installed node_modules
// tree or substituting VPM code in the benchmark/differential baseline.
function load(request, parent = root) {
  if (isBuiltin(request)) return require(request);
  let file = request.startsWith('.') ? path.resolve(parent, request) : path.join(root, request);
  if (!file.startsWith(root + path.sep)) throw new Error('Unexpected fixture path: ' + request);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    const manifest = path.join(file, 'package.json');
    file = path.join(file, fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest)).main || 'index.js' : 'index.js');
  }
  if (!fs.existsSync(file) && fs.existsSync(file + '.js')) file += '.js';
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) module.exports = JSON.parse(source);
  else vm.compileFunction(source, ['require', 'module', 'exports'], { filename: file })(name => load(name, path.dirname(file)), module, module.exports);
  return module.exports;
}
module.exports = load('qs');
