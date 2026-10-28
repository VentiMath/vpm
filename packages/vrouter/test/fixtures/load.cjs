'use strict';
const fs = require('node:fs');
const path = require('node:path');
const debugLoad = require('../../../vdebug/test/load.cjs');
const debugRoot = path.join(__dirname, '../../../vdebug/test/fixtures/debug-4.4.3');
const debugCommon = debugLoad(path.join(debugRoot, 'common.js'), { ms: require('../../../vdebug/test/fixtures/ms-2.1.3.cjs') });
const debug = debugLoad(path.join(debugRoot, 'node.js'), { './common': debugCommon });

// Unmodified verified sources, with an explicit dependency map. The middle
// implementation isolates the cost of the caller from its VPM dependencies.
module.exports = function load(vpmDependencies = false) {
  const imports = {
    debug: vpmDependencies ? require('../../../vdebug') : debug,
    depd: vpmDependencies ? require('../../../vdepd') : require('../../../vdepd/test/fixtures/depd-2.0.0.cjs'),
    parseurl: vpmDependencies ? require('../../../vparseurl') : require('../../../vparseurl/test/fixtures/parseurl-1.3.3.cjs'),
    'path-to-regexp': vpmDependencies ? require('../../../vpath-to-regexp') : require('../../../vpath-to-regexp/test/fixtures/path-to-regexp-8.4.2.cjs'),
    'is-promise': require('./is-promise-4.0.0.cjs'),
    'node:http': require('node:http'),
  };
  const cache = new Map();
  function evaluate(relative) {
    const file = path.join(__dirname, 'router-2.2.0', relative);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    new Function('exports', 'require', 'module', '__filename', '__dirname', fs.readFileSync(file, 'utf8'))
      .call(mod.exports, mod.exports, name => {
        if (Object.hasOwn(imports, name)) return imports[name];
        if (name.startsWith('./')) return evaluate(path.join(path.dirname(relative), name + '.js'));
        throw new Error('Unexpected fixture dependency: ' + name);
      }, mod, file, path.dirname(file));
    return mod.exports;
  }
  return evaluate('index.js');
};
