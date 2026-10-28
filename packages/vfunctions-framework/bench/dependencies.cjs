'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
module.exports = function dependencySnapshot() {
  const seen = new Map();
  function walk(manifest) {
    manifest = fs.realpathSync(manifest);
    if (seen.has(manifest)) return;
    const metadata = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    seen.set(manifest, { name: metadata.name, version: metadata.version });
    const from = createRequire(manifest);
    for (const name of Object.keys(metadata.dependencies || {})) {
      let child;
      try { child = from.resolve(name + '/package.json'); } catch (error) {
        if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
        for (const directory of from.resolve.paths(name) || []) {
          const file = path.join(directory, name, 'package.json');
          if (fs.existsSync(file)) { child = file; break; }
        }
      }
      if (!child) throw new Error('Missing dependency manifest: ' + name);
      walk(child);
    }
  }
  walk(path.join(root, 'scripts/consumers/node_modules/@google-cloud/functions-framework/package.json'));
  return { externalInstances: seen.size - 1,
    packages: [...seen.values()].map(p => p.name + '@' + p.version).sort() };
};
