'use strict';
// Measure logging CPU with an output sink, not terminal or Cloud Logging I/O.
// Only the selected implementation is loaded in a timed worker.
const assert = require('node:assert/strict'), path = require('node:path');
const roots = {upstream: path.resolve(__dirname, '../../../scripts/firebase-functions-conformance/node_modules/firebase-functions'), vpm: path.resolve(__dirname, '..')};
function logging(root, call) {
  const common = require(path.join(root, 'lib/logger/common.js'));
  let line;
  for (const key of Object.keys(common.UNPATCHED_CONSOLE)) common.UNPATCHED_CONSOLE[key] = output => {line = output;};
  const logger = require(path.join(root, 'lib/logger/index.js'));
  return () => {call(logger); return line;};
}
const cases = [
  {name: 'logger / formatted status', make: root => logging(root, log => log.info('saved %d records', 3)), validate: output => assert.deepEqual(JSON.parse(output), {severity: 'INFO', message: 'saved 3 records'})},
  {name: 'logger / structured request', make: root => {
    const data = {path: '/api/rooms', method: 'GET', count: 12, elapsed: 1.25};
    return logging(root, log => log.info('request', data));
  }, validate: output => assert.deepEqual(JSON.parse(output), {path: '/api/rooms', method: 'GET', count: 12, elapsed: 1.25, severity: 'INFO', message: 'request'})},
  {name: 'logger / nested data', make: root => {
    const entry = {severity: 'INFO', message: 'rooms', rooms: Array.from({length: 10}, (_, id) => ({id, tags: ['math', 'practice'], open: true}))};
    return logging(root, log => log.write(entry));
  }, validate: output => {const data = JSON.parse(output); assert.equal(data.rooms.length, 10); assert.deepEqual(data.rooms[9], {id: 9, tags: ['math', 'practice'], open: true});}},
  {name: 'initializer / already initialized handler', async: true, make: async root => {
    const {onInit, withInit} = require(path.join(root, 'lib/common/onInit.js'));
    onInit(() => {});
    const handler = withInit(value => value + 1);
    await handler(41);
    return () => handler(41);
  }, validate: output => assert.equal(output, 42)},
];
require('../../../scripts/bench-process.cjs').run({root: path.resolve(__dirname, '..'), upstream: roots.upstream, vpm: roots.vpm, cases,
  files: ['package.json', 'PROVENANCE.json', 'lib/logger', 'lib/common/onInit.js', 'lib/common/trace.js', 'bench/compare.cjs',
    '../../scripts/firebase-functions-conformance/node_modules/firebase-functions/lib/logger',
    '../../scripts/firebase-functions-conformance/node_modules/firebase-functions/lib/common/onInit.js',
    '../../scripts/firebase-functions-conformance/node_modules/firebase-functions/lib/common/trace.js']
}).catch(error => {console.error(error); process.exitCode = 1;});
