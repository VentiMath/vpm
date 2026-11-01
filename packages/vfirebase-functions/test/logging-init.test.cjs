'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const {UNPATCHED_CONSOLE} = require('../lib/logger/common.js');
const logger = require('../lib/logger/index.js');
const {traceContext} = require('../lib/common/trace.js');
function capture(t) {
  const entries = [], original = {...UNPATCHED_CONSOLE};
  for (const key of Object.keys(original)) UNPATCHED_CONSOLE[key] = line => entries.push([key, JSON.parse(line)]);
  t.after(() => Object.assign(UNPATCHED_CONSOLE, original)); return entries;
}

test('structured logging preserves format, severity, metadata and error messages', t => {
  const entries = capture(t);
  logger.info('saved %d', 3, {request: 'r1'});
  logger.warn({message: 'metadata message', retry: true});
  logger.error(new Error('failed'));
  assert.deepEqual(entries.slice(0, 2), [['info', {request: 'r1', severity: 'INFO', message: 'saved 3'}], ['warn', {message: 'metadata message', retry: true, severity: 'WARNING'}]]);
  assert.match(entries[2][1].message, /Error: failed/);
});

test('trace fields do not mutate frozen caller entries', t => {
  const entries = capture(t), entry = Object.freeze({severity: 'INFO', message: 'frozen'});
  traceContext.run({traceId: '0123456789abcdef0123456789abcdef'}, () => logger.write(entry));
  assert.equal(entries[0][1]['logging.googleapis.com/trace'], `projects/${process.env.GCLOUD_PROJECT}/traces/0123456789abcdef0123456789abcdef`);
  assert.deepEqual(Object.keys(entry), ['severity', 'message']);
});

test('null prototypes, shadowed methods, own prototype keys and throwing getters remain loggable', t => {
  const entries = capture(t), data = Object.create(null);
  Object.assign(data, JSON.parse('{"__proto__":{"safe":true},"hasOwnProperty":0}'));
  Object.defineProperty(data, 'bad', {enumerable: true, get() {throw Error('getter');}});
  logger.info('data', data);
  assert.equal(entries[0][1].hasOwnProperty, 0);
  assert.equal(Object.hasOwn(entries[0][1], '__proto__'), true);
  assert.equal(entries[0][1].bad, '[Error - cannot serialize]');
  assert.equal({}.safe, undefined);
});

test('cycles are bounded, shared siblings retain data, and bigint stays precise', t => {
  const entries = capture(t), shared = {n: 1}, cyclic = {}; cyclic.self = cyclic;
  const throughJSON = {toJSON() {return {self: this};}};
  logger.info({left: shared, right: shared, cyclic, throughJSON, integer: 9007199254740993n});
  assert.deepEqual(entries[0][1].left, entries[0][1].right);
  assert.deepEqual(entries[0][1].cyclic, {self: '[Circular]'});
  assert.deepEqual(entries[0][1].throughJSON, {self: '[Circular]'});
  assert.equal(entries[0][1].integer, '9007199254740993');
});

test('a deep log record is bounded rather than overflowing the call stack', t => {
  const entries = capture(t), root = {}; let next = root;
  for (let i = 0; i < 10000; i++) next = next.child = {};
  logger.info({root});
  assert.match(JSON.stringify(entries[0][1]), /\[MaxDepth\]/);
});

test('a previous initializer completing cannot suppress a newly registered callback', async t => {
  capture(t);
  const modulePath = require.resolve('../lib/common/onInit.js'); delete require.cache[modulePath];
  const {onInit, withInit} = require(modulePath);
  let release, old = 0, current = 0;
  onInit(async () => {old++; await new Promise(resolve => {release = resolve;});});
  const run = withInit(function () {return this.value;});
  const first = run.call({value: 1}); await Promise.resolve();
  onInit(async () => {current++;}); release();
  assert.equal(await first, 1);
  assert.equal(await run.call({value: 2}), 2);
  assert.deepEqual({old, current}, {old: 1, current: 1});
});


test('toJSON is invoked once and throwing root conversions still emit an entry', t => {
  const entries = capture(t);
  let calls = 0;
  const self = {toJSON() {calls++; return this;}, value: 3};
  logger.info({self});
  assert.equal(calls, 1);
  assert.deepEqual(entries[0][1].self, {value: 3});
  logger.write({severity: 'WARNING', toJSON() {throw Error('conversion');}});
  assert.deepEqual(entries[1], ['warn', {severity: 'WARNING', message: '[Error - cannot serialize]'}]);
});

test('CommonJS and ESM share logger, trace context and initialization state', async t => {
  const entries = capture(t);
  const esm = await import('../lib/esm/logger/index.mjs');
  const trace = await import('../lib/esm/common/trace.mjs');
  const init = await import('../lib/esm/common/onInit.mjs');
  const cjs = require('../lib/common/onInit.js');
  assert.equal(esm.info, logger.info);
  assert.equal(trace.traceContext, traceContext);
  assert.equal(init.onInit, cjs.onInit);
  trace.traceContext.run({traceId: 'trace'}, () => esm.info('shared'));
  assert.match(entries.at(-1)[1]['logging.googleapis.com/trace'], /traces\/trace$/);
  let calls = 0;
  init.onInit(() => {calls++;});
  await Promise.all([cjs.withInit(() => 1)(), init.withInit(() => 2)()]);
  assert.equal(calls, 1);
});
