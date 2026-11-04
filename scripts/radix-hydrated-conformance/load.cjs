'use strict';
const path = require('node:path'), { createRequire } = require('node:module');
module.exports = (variant, version = '19.1') => {
  const folder = path.join(__dirname, version === '19.2' ? 'current' : '');
  const selected = createRequire(path.join(folder, 'package.json'));
  return { api: selected(path.join(folder, 'node_modules/.vpm-hydrated', variant + '.cjs')), React: selected('react'), selected };
};
