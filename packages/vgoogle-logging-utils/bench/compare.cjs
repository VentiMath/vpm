'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), {format} = require('node:util');
const upstream = require('../../../scripts/consumers/node_modules/google-logging-utils'), vpm = require('..');
const cases = [], noop = () => {};
const add = (name, make, validate) => cases.push({name, make, validate, async: false});
let sequence = 0, line, dispatched;
const original = console.error;
console.error = (...args) => { line = args; };
add('disabled logger lookup', lib => { delete process.env.GOOGLE_SDK_NODE_LOGGING; return () => lib.log('disabled'); }, value => assert.equal(typeof value, 'function'));
add('disabled logger invocation', lib => { delete process.env.GOOGLE_SDK_NODE_LOGGING; const logger = lib.log('disabled'); return () => { logger.info('message', 3); return 1; }; }, value => assert.equal(value, 1));
add('cached logger lookup', lib => { process.env.GOOGLE_SDK_NODE_LOGGING = '*'; lib.setBackend({log: noop, setFilters: noop}); const name = 'lookup-' + ++sequence; return () => lib.log(name); }, value => assert.equal(typeof value.info, 'function'));
add('custom backend dispatch', lib => { process.env.GOOGLE_SDK_NODE_LOGGING = '*'; lib.setBackend({log: (_namespace, fields, message) => { dispatched = fields.severity + ':' + message; }, setFilters: noop}); const logger = lib.log('dispatch-' + ++sequence); return () => { logger.info('message'); return dispatched; }; }, value => assert.equal(value, 'INFO:message'));
add('event tap dispatch', lib => { const logger = new lib.AdhocDebugLogger('tap', noop); let value; logger.on('log', (fields, args) => { value = fields.severity + ':' + args[0]; }); return () => { logger.func.info('message'); return value; }; }, value => assert.equal(value, 'INFO:message'));
add('filtered node output', lib => { process.env.GOOGLE_SDK_NODE_LOGGING = 'allowed'; const backend = lib.getNodeBackend(); return () => { line = undefined; backend.log('denied', {}, 'private'); return line; }; }, value => assert.equal(value, undefined));
add('formatted node output', lib => { process.env.GOOGLE_SDK_NODE_LOGGING = '*'; const backend = lib.getNodeBackend(); const fields = {severity: 'INFO'}; return () => { backend.log('bench', fields, 'value=%d', 3); return line; }; }, value => assert.match(format(...value), /\[bench\|INFO\] value=3$/));
add('structured custom backend', lib => {
  process.env.GOOGLE_SDK_NODE_LOGGING = '*'; let value;
  class Sink extends lib.DebugLogBackendBase { setFilters() {} makeLogger() { return (_fields, text) => { value = text; }; } }
  const backend = lib.getStructuredBackend(new Sink()); const fields = {severity: 'INFO'};
  return () => { backend.log('bench', fields, 'value=%d', 3); return value; };
}, value => assert.deepEqual(JSON.parse(value), {severity: 'INFO', message: 'value=3'}));
require('../../../scripts/bench-paired.cjs').run({root: path.resolve(__dirname, '..'), upstream, vpm, cases,
  files: ['index.js', 'package.json', 'PROVENANCE.json', 'bench/compare.cjs', '../../scripts/consumers/node_modules/google-logging-utils/build/src/logging-utils.js', '../../scripts/consumers/node_modules/google-logging-utils/build/src/colours.js', '../../scripts/consumers/package-lock.json'], cleanup: async () => { console.error = original; }
}).catch(error => { console.error = original; console.error(error); process.exitCode = 1; });
