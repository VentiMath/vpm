'use strict';
const fs = require('node:fs'), path = require('node:path'), { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function sources() {
  const files = new Set(), seen = new Set();
  function visit(name) {
    if (seen.has(name)) return; seen.add(name);
    const dir = path.join(root, 'packages', name), metadata = require(path.join(dir, 'package.json'));
    for (const file of fs.readdirSync(dir)) if (/\.(?:cjs|mjs)$/.test(file) || file === 'package.json') files.add('packages/' + name + '/' + file);
    for (const dependency of Object.keys(metadata.dependencies || {})) visit(dependency);
  }
  visit('vradix-react-dropdown-menu');
  for (const file of ['build.cjs', 'sources.cjs', 'entry.mjs', 'package-lock.json', 'current/package-lock.json']) files.add('scripts/radix-dropdown-menu-conformance/' + file);
  return Object.fromEntries([...files].sort().map(file => [file, hash(path.join(root, file))]));
}
module.exports = { sources, hash };
