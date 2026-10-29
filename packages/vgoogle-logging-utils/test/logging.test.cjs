'use strict';
const {test, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const {format} = require('node:util');
const lib = require('..');
const originalFlag = process.env[lib.env.nodeEnables];
let sequence = 0;
const capture = fn => { const lines = [], original = {error: console.error, log: console.log}; for (const method of ['error', 'log']) console[method] = (...args) => lines.push(format(...args)); try { fn(lines); } finally { Object.assign(console, original); } return lines; };
const enabled = () => { process.env[lib.env.nodeEnables] = '*'; return 'test-' + ++sequence; };
afterEach(() => { if (originalFlag === undefined) delete process.env[lib.env.nodeEnables]; else process.env[lib.env.nodeEnables] = originalFlag; lib.setBackend(undefined); });
test('public callable, severity methods, chaining and sublogger', () => {
  const namespace = enabled(), records = [];
  lib.setBackend({setFilters() {}, log: (...args) => records.push(args)});
  const log = lib.log(namespace), taps = [];
  assert.equal(log.on('log', (fields, args) => taps.push([fields, args])), log);
  log.info('hello', 3); log.warn('warn'); log.debug('debug'); log.error('error'); log.sublog('child')({}, 'child');
  assert.deepEqual(records[0], [namespace, {severity: 'INFO'}, 'hello', 3]); assert.equal(taps.length, 4);
  assert.equal(records[4][0], namespace + ':child'); assert(Object.isFrozen(records[0][1]));
});
test('backend replacement preserves logger identity and event sinks', () => {
  const namespace = enabled(), first = [], second = [];
  lib.setBackend({setFilters() {}, log: (...args) => first.push(args)});
  const log = lib.log(namespace); let events = 0; log.on('log', () => events++); log.info('first');
  lib.setBackend({setFilters() {}, log: (...args) => second.push(args)});
  assert.equal(lib.log(namespace), log); log.info('second');
  assert.equal(first.length, 1); assert.equal(second.length, 1); assert.equal(events, 2);
});
test('disabled placeholder never leaks records between namespaces', () => {
  delete process.env[lib.env.nodeEnables]; const a = lib.log('a'), b = lib.log('b'); let count = 0;
  a.on('log', () => count++); a.instance.on('log', () => count++);
  b({}, 'private'); b.info('private'); b.sublog('child').error('private');
  assert.equal(count, 0); assert.equal(a, lib.placeholder); a.instance.removeAllListeners();
});
test('null backend disables old and new output; restoring it retains existing sinks', () => {
  const namespace = enabled(), records = [];
  const backend = {setFilters() {}, log: (...args) => records.push(args)};
  lib.setBackend(backend); const log = lib.log(namespace); lib.setBackend(null);
  log.info('disabled'); lib.log(namespace).info('disabled'); assert.equal(records.length, 0);
  lib.setBackend(backend); log.info('enabled'); assert.equal(lib.log(namespace), log); assert.equal(records.length, 1);
});
test('failed custom backend and failed event tap do not interrupt other taps', () => {
  const namespace = enabled(); lib.setBackend({setFilters() {}, log() { throw new Error('secret'); }});
  const log = lib.log(namespace); let count = 0;
  log.on('log', () => { throw new Error('private'); }); log.on('log', () => count++);
  log.instance.once('log', () => count++);
  assert.deepEqual(capture(() => { log.info('first'); log.info('second'); }), []);
  assert.equal(count, 3);
});
test('base backend suppresses failures without printing error contents', () => {
  class Broken extends lib.DebugLogBackendBase { setFilters() {} makeLogger() { throw new Error('private credentials'); } }
  assert.deepEqual(capture(() => new Broken().log('a', {})), []);
});
test('node backend emits familiar prefix and excludes severity from extra fields', () => {
  enabled(); const backend = lib.getNodeBackend();
  const lines = capture(() => backend.log('sample', {severity: 'INFO', other: {id: 4}}, 'value=%d', 3));
  assert.match(lines[0], /\[sample\|INFO\] value=3 \{"other":\{"id":4\}\}$/);
});
test('filters are literal except wildcard, case-insensitive, whitespace-trimmed and repeatable', () => {
  enabled(); const backend = lib.getNodeBackend(); backend.setFilters([' alpha:* ', 'literal.+', 'a*b*c']);
  const lines = capture(() => {
    for (let i = 0; i < 3; i++) backend.log('ALPHA:x', {}, 'pass');
    backend.log('literal.+', {}, 'pass'); backend.log('literalZZ', {}, 'fail'); backend.log('axbyc', {}, 'pass'); backend.log('acb', {}, 'fail');
  }); assert.equal(lines.length, 5); assert(lines.every(line => line.includes('pass')));
});
test('changing filters invalidates cached disabled and enabled loggers', () => {
  enabled(); const backend = lib.getNodeBackend(); const filters = ['a']; backend.setFilters(filters); filters[0] = '*';
  const lines = capture(() => { backend.log('b', {}, 'disabled'); backend.log('a', {}, 'enabled'); backend.setFilters(['b']); backend.log('a', {}, 'disabled'); backend.log('b', {}, 'enabled'); });
  assert.equal(lines.length, 2); assert(lines.every(line => line.includes('enabled')));
  assert(Object.isFrozen(backend.filters));
});
test('structured default writes complete standalone JSON with one escaped line', () => {
  enabled(); const backend = lib.getStructuredBackend();
  const lines = capture(() => backend.log('a', {other: {id: 4}}, 'hello\n%s', 'world'));
  assert.equal(lines.length, 1); assert.equal(lines[0].includes('\n'), false);
  assert.deepEqual(JSON.parse(lines[0]), {severity: 'INFO', message: 'hello\nworld', other: {id: 4}});
});
test('structured backend honors the advertised public interface and propagates filters', () => {
  enabled(); const records = [], filterCalls = [];
  const upstream = {setFilters: filters => filterCalls.push(filters), log: (...args) => records.push(args)};
  const backend = lib.getStructuredBackend(upstream); backend.setFilters(['a']); backend.log('a', {severity: 'ERROR'}, 'failure');
  assert.deepEqual(filterCalls, [['a']]); assert.deepEqual(records, [['a', {severity: 'ERROR'}, '{"severity":"ERROR","message":"failure"}']]);
});
test('structured default filters rejected namespaces', () => {
  enabled(); const backend = lib.getStructuredBackend(); backend.setFilters(['allowed']);
  const lines = capture(() => { backend.log('denied', {}, 'private'); backend.log('allowed', {}, 'visible'); });
  assert.equal(lines.length, 1); assert.equal(JSON.parse(lines[0]).message, 'visible');
});
test('structured fields cannot overwrite the message or defeat default severity', () => {
  enabled(); const fields = {message: 'forged', severity: undefined, other: true};
  const lines = capture(() => lib.getStructuredBackend().log('a', fields, 'actual'));
  assert.deepEqual(JSON.parse(lines[0]), {severity: 'INFO', message: 'actual', other: true}); assert.equal(fields.message, 'forged');
});
test('cyclic or bigint fields are dropped without dumping private diagnostics', () => {
  enabled(); const cyclic = {}; cyclic.self = cyclic;
  const lines = capture(() => { lib.getStructuredBackend().log('a', {other: cyclic}, 'private'); lib.getNodeBackend().log('a', {other: 1n}, 'private'); }); assert.deepEqual(lines, []);
});
test('debug adapter calls enable(), preserves existing filters and leaves NODE_DEBUG unchanged', () => {
  enabled(); let filters, received;
  const debug = name => (...args) => { received = {name, args}; }; debug.namespaces = 'existing'; debug.enable = value => { filters = value; };
  const before = process.env.NODE_DEBUG, backend = lib.getDebugBackend(debug); backend.setFilters(['test:*']); backend.log('test:a', {}, 'x', 2);
  assert.equal(filters, 'existing,test:*'); assert.deepEqual(received, {name: 'test:a', args: ['x', 2]}); assert.equal(process.env.NODE_DEBUG, before);
});
test('configuration validates backends, namespaces and filter arrays', () => {
  enabled(); assert.throws(() => lib.setBackend({log() {}}), TypeError);
  assert.throws(() => lib.getDebugBackend(() => {}), TypeError);
  assert.throws(() => lib.getStructuredBackend({}), TypeError);
  assert.throws(() => lib.log(42), TypeError);
  assert.throws(() => lib.getNodeBackend().setFilters([42]), TypeError);
});
test('true enables every namespace for plain and structured backends', () => {
  process.env[lib.env.nodeEnables] = 'true';
  for (const make of [lib.getNodeBackend, lib.getStructuredBackend]) {
    const backend = make(); assert.deepEqual(backend.filters, ['*']);
    assert.equal(capture(() => { backend.log('first', {}, 'visible'); backend.log('other:child', {}, 'visible'); }).length, 2);
  }
});
test('an explicit backend enables logging without the environment flag, including subloggers', () => {
  delete process.env[lib.env.nodeEnables]; const records = [];
  lib.setBackend({setFilters() {}, log: (...args) => records.push(args)});
  const logger = lib.log('manual-' + ++sequence); assert.notEqual(logger, lib.placeholder);
  logger.info('manual'); logger.sublog('child').warn('child');
  assert.deepEqual(records, [[logger.instance.namespace, {severity: 'INFO'}, 'manual'], [logger.instance.namespace + ':child', {severity: 'WARNING'}, 'child']]);
  lib.setBackend(null); assert.equal(lib.log(logger.instance.namespace), lib.placeholder);
  logger.info('disabled'); assert.equal(records.length, 2);
  lib.setBackend(undefined); assert.equal(lib.log(logger.instance.namespace), lib.placeholder);
});
test('selected default backend persists after removing the environment flag', () => {
  enabled(); lib.setBackend(undefined);
  const logger = lib.log('automatic-' + ++sequence); delete process.env[lib.env.nodeEnables];
  assert.equal(lib.log(logger.instance.namespace), logger);
  assert.equal(capture(() => logger.sublog('child').info('still enabled')).length, 1);
  lib.setBackend(undefined); assert.equal(lib.log(logger.instance.namespace), lib.placeholder);
});
test('structured default uses stdout and ordinary Node output uses stderr', () => {
  enabled(); const original = {log: console.log, error: console.error}, records = [];
  try {
    for (const method of ['log', 'error']) console[method] = (...args) => records.push([method, format(...args)]);
    lib.getStructuredBackend().log('stdout', {severity: 'ERROR'}, 'structured');
    lib.getNodeBackend().log('stderr', {severity: 'INFO'}, 'plain');
  } finally { Object.assign(console, original); }
  assert.equal(records.length, 2); assert.equal(records[0][0], 'log'); assert.equal(records[1][0], 'error');
  assert.deepEqual(JSON.parse(records[0][1]), {severity: 'ERROR', message: 'structured'});
  assert.match(records[1][1], /\[stderr\|INFO\] plain$/);
});
