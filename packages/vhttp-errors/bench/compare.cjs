'use strict';
const path = require('node:path');
const compare = require('../../../scripts/compare.cjs');
const createError = require('..');
const before = process.argv[2] ? require(path.resolve(process.argv[2])) : require('../test/upstream.cjs');
console.log(process.argv[2] ? 'Installed upstream: ' + process.argv[2] : 'Pinned upstream factory with native runtime shims; warnings disabled.');
const existing = new Error('original');
compare([
  ['factory 404', factory => factory(404).status],
  ['named constructor', factory => new factory.NotFound('missing').status],
  ['custom properties', factory => factory(429, 'limit', { detail: 'retry', expose: false }).status],
  ['annotate existing Error', factory => factory(500, existing).status],
].map(([name, fn]) => ({ name, inputs: [null], before: () => fn(before), after: () => fn(createError) })));
