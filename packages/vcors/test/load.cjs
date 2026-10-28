'use strict';
const fs = require('node:fs');
const path = require('node:path');
module.exports = version => {
  const file = path.join(__dirname, 'fixtures/cors-' + version + '.cjs');
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', fs.readFileSync(file, 'utf8'))(name => {
    if (name === 'vary') return require('../../vvary/test/fixtures/vary-1.1.2.cjs');
    if (name === 'object-assign') return require('./fixtures/object-assign-4.1.1.cjs');
    throw new Error('unexpected upstream dependency: ' + name);
  }, mod, mod.exports);
  return mod.exports;
};
