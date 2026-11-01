'use strict';
// An isolated installed-module tree: MUI, the renderer and Emotion all resolve
// the same React and styling contexts. Call from --preserve-symlinks workers.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {createRequire} = require('node:module');
module.exports = function consumerTree(library) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vpm-emotion-consumer-')));
  const modules = path.join(directory, 'node_modules');
  const fixture = path.join(__dirname, 'node_modules'), packages = path.resolve(__dirname, '../../packages');
  fs.mkdirSync(modules);
  const link = (source, name) => fs.symlinkSync(source, path.join(modules, name), 'dir');
  for (const name of fs.readdirSync(fixture)) {
    if (name.startsWith('.') || name === '@emotion' || name === 'react' || name === 'react-dom') continue;
    link(path.join(fixture, name), name);
  }
  link(path.join(fixture, 'react19'), 'react');
  link(path.join(fixture, 'react19-dom'), 'react-dom');
  fs.mkdirSync(path.join(modules, '@emotion'));
  for (const name of fs.readdirSync(path.join(fixture, '@emotion'))) {
    const replacement = path.join(packages, 'vemotion-' + name);
    if (library !== 'vpm' || !fs.existsSync(replacement)) {
      link(path.join(fixture, '@emotion', name), '@emotion/' + name);
      continue;
    }
    // A second symlink to the same directory would create a second module
    // identity under --preserve-symlinks. Alias exports instead, so callers of
    // @emotion/react and vemotion-react share exactly the same contexts.
    const alias = path.join(modules, '@emotion', name);
    fs.mkdirSync(alias);
    const metadata = JSON.parse(fs.readFileSync(path.join(replacement, 'package.json')));
    const exports = {};
    for (const [index, entry] of Object.keys(metadata.exports).filter(entry => entry !== './package.json').entries()) {
      exports[entry] = `./entry-${index}.js`;
      const target = 'vemotion-' + name + (entry === '.' ? '' : entry.slice(1));
      fs.writeFileSync(path.join(alias, exports[entry]), `import * as api from ${JSON.stringify(target)}; export * from ${JSON.stringify(target)}; export default api.default;\n`);
    }
    fs.writeFileSync(path.join(alias, 'package.json'), JSON.stringify({name: '@emotion/' + name, type: 'module', exports}));
  }
  if (library === 'vpm') for (const name of fs.readdirSync(packages).filter(name => name.startsWith('vemotion-') || name === 'vstylis')) {
    // Copy the package contents without workspace installation artifacts.
    // Bun's isolated linker can put a node_modules directory inside a package;
    // a symlink would expose those dependencies and create duplicate contexts.
    fs.cpSync(path.join(packages, name), path.join(modules, name), {
      recursive: true,
      filter: source => path.basename(source) !== 'node_modules',
    });
  }
  return {require: createRequire(path.join(directory, 'consumer.cjs')), cleanup: () => fs.rmSync(directory, {recursive: true, force: true})};
};
