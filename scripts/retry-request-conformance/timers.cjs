'use strict';
const assert = require('node:assert/strict');
const sinon = require('sinon');
const retry = require('../../packages/vretry-request');
const upstream = require('retry-request');
const {PassThrough} = require('node:stream');
function clocked(fn) {
  const clock = sinon.useFakeTimers({now: 10000, toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout', 'setImmediate', 'clearImmediate']});
  try { fn(clock); } finally { clock.uninstall(); }
}
clocked(clock => {
  let calls = 0;
  const handle = retry(null, {currentRetryAttempt: 10, maxRetryDelay: 1e9, retryDelayMultiplier: 100, totalTimeout: 1e9, request() { calls++; }}, () => {});
  assert.equal(clock.countTimers(), 1);
  clock.tick(2147483647); assert.equal(calls, 0);
  handle.abort(); assert.equal(clock.countTimers(), 0);
});
clocked(clock => {
  let callback, calls = 0, settled = 0;
  retry(null, {totalTimeout: 0.01, request(o, cb) { calls++; callback = cb; }}, () => settled++);
  clock.setSystemTime(-1000000); clock.tick(11); callback(new Error('network'));
  assert.equal(calls, 1); assert.equal(settled, 1); assert.equal(clock.countTimers(), 0);
});
clocked(clock => {
  let calls = 0;
  const handle = retry(null, {currentRetryAttempt: 1, request() { calls++; }}, () => assert.fail());
  handle.abort(); clock.tick(10000); assert.equal(calls, 0); assert.equal(clock.countTimers(), 0);
});
clocked(clock => {
  let calls = 0;
  const output = retry(null, {currentRetryAttempt: 1, request() { calls++; return new PassThrough(); }});
  output.abort(); clock.tick(10000); assert.equal(calls, 0); assert.equal(clock.countTimers(), 0);
});
for (const [library, improved] of [[upstream, false], [retry, true]]) {
  clocked(clock => {
    let calls = 0;
    const handle = library(null, {request(o, cb) { calls++; cb(new Error('network')); }}, () => {});
    handle.abort(); clock.tick(20000); assert.equal(calls, improved ? 1 : 3);
  });
  clocked(() => {
    let completed = false;
    library(null, {totalTimeout: 0, request(o, cb) { cb(new Error('network')); }}, () => { completed = true; });
    assert.equal(completed, improved);
  });
}
console.log('Long timers, monotonic deadlines, initial cancellation and upstream abort/deadline regression controls passed.');
