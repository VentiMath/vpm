'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const root = path.join(__dirname, '..');
const provenance = require('../PROVENANCE.json'), metadata = require('../package.json');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const MAX = 2147483647;

test('package metadata: modern build only, no dependencies', () => {
  assert.equal(metadata.dependencies, undefined);
  assert.equal(metadata.main, './build/modern/index.cjs');
  assert.equal(metadata.module, './build/modern/index.js');
  assert.deepEqual(metadata.files, ['build/modern', 'README.md', 'LICENSE', 'PROVENANCE.json']);
  assert.ok(!fs.existsSync(path.join(root, 'build/legacy')) && !fs.existsSync(path.join(root, 'src')));
});

test('files are 5.105.0\'s apart from the timeout provider and the AbortSignal declarations', () => {
  assert.deepEqual(provenance.modified, ['build/modern/hydration-CS3HS-a9.d.ts', 'build/modern/hydration-DhAJ02bL.d.cts', 'build/modern/timeoutManager.cjs', 'build/modern/timeoutManager.js']);
  assert.deepEqual(provenance.removed, ['build/modern/timeoutManager.cjs.map', 'build/modern/timeoutManager.js.map']);
  for (const [file, hash] of Object.entries(provenance.sourceSHA256)) {
    if (provenance.modified.includes(file) || provenance.removed.includes(file)) continue;
    assert.equal(sha256(fs.readFileSync(path.join(root, file))), hash, file);
  }
});

test('ES module and CommonJS entries export the same API', async () => {
  const esm = await import(path.join(root, 'build/modern/index.js'));
  const cjs = require(path.join(root, 'build/modern/index.cjs'));
  assert.deepEqual(Object.keys(esm).sort(), Object.keys(cjs).sort());
  assert.equal(typeof esm.QueryClient, 'function');
  assert.equal(typeof cjs.timeoutManager.setTimeout, 'function');
});

// Replaces the global timer functions while `run` executes, recording each
// platform timer created.
async function withFakeTimers(run) {
  const saved = {setTimeout, clearTimeout, setInterval, clearInterval};
  const timers = new Map();
  let nextId = 1;
  globalThis.setTimeout = (callback, delay) => { const id = nextId++; timers.set(id, {callback, delay, kind: 'timeout'}); return id; };
  globalThis.setInterval = (callback, delay) => { const id = nextId++; timers.set(id, {callback, delay, kind: 'interval'}); return id; };
  globalThis.clearTimeout = globalThis.clearInterval = id => { timers.delete(id); };
  const fire = id => { const timer = timers.get(id); if (timer.kind === 'timeout') timers.delete(id); timer.callback(); };
  try { return await run({timers, fire}); } finally { Object.assign(globalThis, saved); }
}

for (const format of ['js', 'cjs']) {
  test(`${format}: delays above 2^31 - 1 ms run as a chain of platform timers`, async () => {
    const {defaultTimeoutProvider} = format === 'js' ? await import(path.join(root, 'build/modern/timeoutManager.js')) : require(path.join(root, 'build/modern/timeoutManager.cjs'));
    await withFakeTimers(({timers, fire}) => {
      // Ordinary delays use the platform timer directly.
      const plain = defaultTimeoutProvider.setTimeout(() => {}, 1000);
      assert.equal(typeof plain, 'number');
      assert.equal(timers.get(plain).delay, 1000);
      defaultTimeoutProvider.clearTimeout(plain);
      assert.equal(timers.size, 0);
      // 30 days: one maximal timer, then the remainder, then the callback.
      let calls = 0;
      const long = defaultTimeoutProvider.setTimeout(() => { calls++; }, 30 * 864e5);
      assert.equal(typeof long, 'object');
      const delays = [];
      while (timers.size) {
        assert.equal(timers.size, 1);
        const [[id, timer]] = timers;
        assert.equal(Number(long), id);
        delays.push(timer.delay);
        assert.equal(calls, 0);
        fire(id);
      }
      assert.deepEqual(delays, [MAX, 30 * 864e5 - MAX]);
      assert.equal(calls, 1);
      // Cleared part-way through the chain: nothing remains, nothing runs.
      const cancelled = defaultTimeoutProvider.setTimeout(() => { calls++; }, 3 * MAX);
      fire([...timers.keys()][0]);
      defaultTimeoutProvider.clearTimeout(cancelled);
      assert.equal(timers.size, 0);
      assert.equal(calls, 1);
      // Long intervals repeat; clearing from the callback stops them.
      let ticks = 0;
      const interval = defaultTimeoutProvider.setInterval(() => { if (++ticks === 2) defaultTimeoutProvider.clearInterval(interval); }, MAX + 5);
      for (let i = 0; i < 4; i++) fire([...timers.keys()][0]);
      assert.equal(ticks, 2);
      assert.equal(timers.size, 0);
      // Ordinary intervals and undefined IDs behave as before.
      const short = defaultTimeoutProvider.setInterval(() => {}, 50);
      assert.equal(timers.get(short).kind, 'interval');
      defaultTimeoutProvider.clearInterval(short);
      defaultTimeoutProvider.clearTimeout(undefined);
      assert.equal(timers.size, 0);
    });
  });
}
