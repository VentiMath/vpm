'use strict';
const fs = require('node:fs'), path = require('node:path'), { createRequire } = require('node:module');

// Execute unchanged upstream modules with one React instance. The only upstream
// substitution is Arrow; its VPM dependency closure resolves from this checkout.
module.exports = (variant, version = '19.1') => {
  const selected = createRequire(path.join(__dirname, version === '19.2' ? 'current/package.json' : 'package.json'));
  const cache = new Map(), root = path.resolve(__dirname, '../../packages');
  const arrow = variant === 'upstream' ? require.resolve('@radix-ui/react-arrow') : path.join(root, 'vradix-react-arrow/index.cjs');
  function evaluate(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }, local = createRequire(file); cache.set(file, module);
    new Function('require', 'module', 'exports', '__filename', '__dirname', fs.readFileSync(file, 'utf8'))(name => {
      if (/^react(?:-dom)?(?:\/|$)/.test(name)) return selected(name);
      if (name === '@radix-ui/react-arrow') return evaluate(arrow);
      if (name.startsWith('vradix-react-')) return evaluate(path.join(root, name, 'index.cjs'));
      const resolved = local.resolve(name);
      return resolved.includes('/node_modules/') && /\.c?js$/.test(resolved) ? evaluate(resolved) : local(name);
    }, module, module.exports, file, path.dirname(file));
    return module.exports;
  }
  return { api: evaluate(arrow), React: selected('react'), selected, caller: () => evaluate(require.resolve('@radix-ui/react-popper')) };
};
