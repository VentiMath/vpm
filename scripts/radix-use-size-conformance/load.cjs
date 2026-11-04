'use strict';
const fs = require('node:fs'), path = require('node:path'), { createRequire } = require('node:module');
module.exports = (variant, version = '19.1') => {
  const selected = createRequire(path.join(__dirname, version === '19.2' ? 'current/package.json' : 'package.json'));
  const React = selected('react'), cache = new Map();
  const hook = variant === 'upstream' ? require.resolve('@radix-ui/react-use-size') : path.resolve(__dirname, '../../packages/vradix-react-use-size/index.cjs');
  const localEffect = path.resolve(__dirname, '../../packages/vradix-react-use-layout-effect/index.cjs');
  function evaluate(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }, local = createRequire(file); cache.set(file, module);
    new Function('require', 'module', 'exports', '__filename', '__dirname', fs.readFileSync(file, 'utf8'))(name => {
      if (name === 'react') return React;
      if (name.startsWith('react/')) return selected(name);
      if (name === 'react-dom' || name.startsWith('react-dom/')) return selected(name);
      if (name === '@radix-ui/react-use-size') return evaluate(hook);
      if (name === 'vradix-react-use-layout-effect') return evaluate(localEffect);
      const resolved = local.resolve(name);
      return resolved.includes('/node_modules/') && /\.c?js$/.test(resolved) ? evaluate(resolved) : local(name);
    }, module, module.exports, file, path.dirname(file));
    return module.exports;
  }
  return { api: evaluate(hook), React, selected, caller: () => evaluate(require.resolve('@radix-ui/react-popper')) };
};
