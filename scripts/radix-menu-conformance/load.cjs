'use strict';
const path = require('node:path'), { createRequire } = require('node:module');
module.exports = (variant, version = '19.1', production = false) => {
  const folder = path.join(__dirname, version === '19.2' ? 'current' : '');
  require('./check-built.cjs')(production);
  const selected = createRequire(path.join(folder, 'package.json'));
  return { api: selected(path.join(folder, production ? 'node_modules/.vpm-menu-production' : 'node_modules/.vpm-menu', variant + '.cjs')), React: selected('react'), selected };
};
