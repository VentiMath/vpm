'use strict';
// Stable class names for styled components (component selectors): a hash of
// the package's name and the file's path from the package root, and the
// component's position in the file.
const fs = require('node:fs');
const nodePath = require('node:path');
const hash = require('vemotion-hash').default;

const packageRoots = new Map();
/** The nearest directory with a package.json, and the package's name. */
function packageOf(filename) {
  if (packageRoots.has(filename)) return packageRoots.get(filename);
  let result = null;
  for (let directory = filename; ; ) {
    if (fs.existsSync(nodePath.join(directory, 'package.json'))) {
      let name = '';
      try {
        name = JSON.parse(fs.readFileSync(nodePath.join(directory, 'package.json'), 'utf8')).name ?? '';
      } catch {}
      result = {root: directory, name};
      break;
    }
    const parent = nodePath.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  packageRoots.set(filename, result);
  return result;
}

const normalize = path => nodePath.normalize(path).split(nodePath.sep).join('/');

exports.getTargetClassName = state => {
  if (state.emotionTargetClassNameCount === undefined) state.emotionTargetClassNameCount = 0;
  const filename = state.file.opts.filename && state.file.opts.filename !== 'unknown' ? state.file.opts.filename : '';
  let moduleName = '';
  let relativePath = '';
  if (filename) {
    const found = packageOf(filename);
    if (found) {
      moduleName = found.name;
      relativePath = filename === found.root ? 'root' : filename.slice(found.root.length);
    } else {
      relativePath = 'root';
    }
  } else {
    // Without a file, the code itself is hashed, with the name
    // @emotion/babel-plugin has always used there (its own package's), so
    // that class names stay as they were.
    moduleName = '@emotion/babel-plugin';
  }
  const position = state.emotionTargetClassNameCount++;
  const parts = [moduleName, relativePath ? normalize(relativePath) : state.file.code];
  return `e${hash(parts.join(''))}${position}`;
};
