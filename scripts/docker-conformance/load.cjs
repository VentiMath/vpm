'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');

function currentControl() {
  const file = path.join(__dirname, 'node_modules/.is-docker-control.cjs');
  const source = fs.readFileSync(path.join(__dirname, 'node_modules/is-docker/index.js'), 'utf8');
  if (!source.startsWith("import fs from 'node:fs';") || !source.includes('export default function isDocker()')) throw new Error('Unexpected upstream module boundary');
  // Adapt only the two module declarations; probe and cache code stays intact.
  fs.writeFileSync(file, source.replace("import fs from 'node:fs';", "const fs = require('node:fs');").replace('export default function isDocker()', 'module.exports = function isDocker()'));
  return file;
}

function loadModule(file, overrides = {}, processStub = process) {
  const mod = {exports: {}};
  const native = createRequire(file);
  const require = name => Object.hasOwn(overrides, name) ? overrides[name] : native(name);
  const source = fs.readFileSync(file, 'utf8').replace(/^#![^\n]*\n/, '');
  vm.runInNewContext('(function(require,module,exports,process,__dirname,Buffer){' + source + '\n})', {}, {filename: file})(require, mod, mod.exports, processStub, path.dirname(file), Buffer);
  return mod.exports;
}

function load(file, fsStub) {
  const mod = loadModule(file, {'node:fs': fsStub, fs: fsStub});
  return mod.default || mod;
}

function filesystem(entries = {}) {
  const calls = [];
  const stub = {
    statSync(file, options) {
      calls.push(['stat', file]);
      const value = entries[file];
      if (value instanceof Error) throw value;
      if (value !== undefined) return {};
      if (options?.throwIfNoEntry === false) return undefined;
      throw Object.assign(new Error('missing'), {code: 'ENOENT'});
    },
    readFileSync(file, encoding) {
      calls.push(['read', file, encoding]);
      const value = entries[file];
      if (value instanceof Error) throw value;
      if (value === undefined) throw Object.assign(new Error('missing'), {code: 'ENOENT'});
      return value;
    },
  };
  return {stub, calls, entries};
}

module.exports = {loadModule, load, filesystem, currentControl};
