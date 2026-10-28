'use strict';
// Load the verified upstream source without changing its dependency requests.
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, 'proxy-addr-2.0.8.cjs');
const source = fs.readFileSync(file, 'utf8');
module.exports = function load(vpmDependencies = false) {
  const mod = { exports: {} };
  const imports = {
    forwarded: vpmDependencies ? require('../../../vforwarded') : require('../../../vforwarded/test/fixtures/forwarded-0.2.0.cjs'),
    'ipaddr.js': vpmDependencies ? require('../../../vipaddr') : require('../../../vipaddr/test/fixtures/ipaddr-1.9.1.cjs'),
  };
  const dependency = name => {
    if (!Object.hasOwn(imports, name)) throw new Error('Unexpected fixture dependency: ' + name);
    return imports[name];
  };
  new Function('exports', 'require', 'module', '__filename', '__dirname', source)
    .call(mod.exports, mod.exports, dependency, mod, file, __dirname);
  return mod.exports;
};
