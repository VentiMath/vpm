'use strict';
const test = require('node:test'), assert = require('node:assert/strict');

test('ESM import and Node 24 CommonJS require share the same cache classes', async () => {
  const esm = await import('../query-client.js'), cjs = require('../query-client.js');
  assert.equal(esm.QueryClient, cjs.QueryClient);
  const client = new cjs.QueryClient(); client.setQueryData(['import'], 'shared');
  assert.equal(client.getQueryData(['import']), 'shared'); client.clear();
});

test('long timers chain bounded delays and can be cancelled between segments', async () => {
  const {schedule} = await import('../runtime.js');
  const saved = {setTimeout, clearTimeout}, timers = new Map(); let id = 0;
  globalThis.setTimeout = (fn, ms) => {timers.set(++id, {fn, ms}); return id;};
  globalThis.clearTimeout = id => timers.delete(id);
  const fire = () => {const [id, timer] = timers.entries().next().value; timers.delete(id); timer.fn();};
  try {
    let calls = 0;
    const cancel = schedule(() => calls++, 30 * 864e5);
    assert.equal([...timers.values()][0].ms, 2147483647); fire();
    assert.equal([...timers.values()][0].ms, 30 * 864e5 - 2147483647); assert.equal(calls, 0);
    fire(); assert.equal(calls, 1); cancel();
    const stop = schedule(() => calls++, 3 * 2147483647); fire(); stop();
    assert.equal(timers.size, 0); assert.equal(calls, 1);
    schedule(() => calls++, Infinity)(); assert.equal(timers.size, 0);
  } finally {Object.assign(globalThis, saved);}
});
