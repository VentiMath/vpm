'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { sources, hash } = require('./sources.cjs');
module.exports = (production = false) => {
  for (const version of ['', 'current/']) {
    const folder = path.join(__dirname, version, production ? 'node_modules/.vpm-dismissable-production' : 'node_modules/.vpm-dismissable');
    const recorded = JSON.parse(fs.readFileSync(path.join(folder, 'sources.json'), 'utf8'));
    assert.deepEqual(recorded.sources, sources(), 'Rebuild stale Dismissable Layer fixtures: bun scripts/radix-dismissable-conformance/build.cjs');
    for (const variant of ['upstream', 'vpm']) assert.equal(hash(path.join(folder, variant + '.cjs')), recorded.bundles[variant]);
  }
};
