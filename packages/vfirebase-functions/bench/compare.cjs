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
  {name: 'declaration / HTTP endpoint', make: root => {
    const {onRequest} = require(path.join(root, 'lib/v2/providers/https.js'));
    const options = {cors: true, memory: '1GiB', timeoutSeconds: 540, secrets: ['API_KEY']};
    return () => onRequest(options, () => {}).__endpoint;
  }, validate: endpoint => {assert.equal(endpoint.availableMemoryMb, 1024); assert.equal(endpoint.timeoutSeconds, 540); assert.deepEqual(endpoint.secretEnvironmentVariables, [{key: 'API_KEY'}]);}},
  {name: 'declaration / serialize 64 fresh endpoints', make: root => {
    const {stackToWire} = require(path.join(root, 'lib/runtime/manifest.js'));
    const {RESET_VALUE} = require(path.join(root, 'lib/common/options.js'));
    return () => stackToWire({specVersion: 'v1alpha1', endpoints: Object.fromEntries(Array.from({length: 64}, (_, i) => ['api' + i,
      {platform: 'gcfv2', minInstances: RESET_VALUE, maxInstances: RESET_VALUE, labels: {service: 'api'}, httpsTrigger: {}}]))});
  }, validate: manifest => {assert.equal(Object.keys(manifest.endpoints).length, 64); assert.equal(manifest.endpoints.api63.minInstances, null);}},
  {name: 'request / initialized HTTP handler', async: true, make: root => {
    const {onRequest} = require(path.join(root, 'lib/v2/providers/https.js'));
    const request = {headers: {}}, response = {value: 0};
    const handler = onRequest((request, response) => {response.value = 42;});
    return async () => {await handler(request, response); return response.value;};
  }, validate: output => assert.equal(output, 42)},
];
require('../../../scripts/bench-process.cjs').run({root: path.resolve(__dirname, '..'), upstream: roots.upstream, vpm: roots.vpm, cases,
  files: ['package.json', 'lib', 'bench/compare.cjs', '../vcors/index.js',
    '../../scripts/firebase-functions-conformance/node_modules/firebase-functions/lib',
    '../../scripts/firebase-functions-conformance/node_modules/cors/lib']
}).catch(error => {console.error(error); process.exitCode = 1;});
