'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
module.exports = function evidence() {
  const hashes = {}, seen = new Set();
  function record(file) {
    hashes[path.relative(root, file)] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  function tree(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (['test', 'bench', 'node_modules'].includes(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) tree(file);
      else if (/\.(?:js|cjs|json)$/.test(entry.name)) record(file);
    }
  }
  function dependency(name) {
    if (seen.has(name)) return; seen.add(name);
    const directory = path.join(root, 'packages', name);
    tree(directory);
    for (const child of Object.keys(require(path.join(directory, 'package.json')).dependencies || {})) dependency(child);
  }
  dependency('vexpress');
  for (const file of ['compare.cjs', 'http.cjs', 'load.cjs', 'evidence.cjs']) record(path.join(__dirname, file));
  for (const file of ['package-lock.json', 'express-5.3.0.tar.gz']) record(path.join(root, 'scripts/express-conformance', file));
  return hashes;
};
