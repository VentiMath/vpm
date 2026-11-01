'use strict';
// Timers longer than 2^31 - 1 ms (about 24.8 days), reproduced with the
// original @tanstack/query-core 5.105.0 and checked in vtanstack-query-core.
// Each library runs in a fresh process on a simulated clock whose timers treat
// a longer delay as 1 ms, as Node (TimeoutOverflowWarning) and browsers do, so
// 30 days pass in milliseconds of real time.
const assert = require('node:assert/strict'), path = require('node:path'), {spawnSync} = require('node:child_process');
const entries = {
  upstream: path.join(__dirname, 'node_modules/@tanstack/query-core/build/modern/index.js'),
  vpm: path.resolve(__dirname, '../../packages/vtanstack-query-core/query-client.js'),
};
const DAY = 864e5;

async function child(entry) {
  // Simulated clock: Date.now and the four timer functions, nothing else.
  let now = Date.UTC(2026, 10, 1), nextId = 1;
  const timers = new Map(), realSetImmediate = setImmediate;
  const add = (callback, delay, interval) => {
    delay = Number(delay) > 2147483647 ? 1 : Math.max(0, Number(delay) || 0);
    const id = nextId++;
    timers.set(id, {at: now + delay, callback, interval: interval ? delay : 0});
    return id;
  };
  Date.now = () => now;
  globalThis.setTimeout = (callback, delay) => add(callback, delay, false);
  globalThis.setInterval = (callback, delay) => add(callback, delay, true);
  globalThis.clearTimeout = globalThis.clearInterval = id => { timers.delete(id); };
  const settle = () => new Promise(resolve => realSetImmediate(resolve));
  const advance = async ms => {
    const target = now + ms;
    for (;;) {
      await settle();
      let next;
      for (const [id, timer] of timers) if (timer.at <= target && (!next || timer.at < timers.get(next).at)) next = id;
      if (!next) break;
      const timer = timers.get(next);
      now = timer.at;
      if (timer.interval) timer.at += Math.max(timer.interval, 1); else timers.delete(next);
      timer.callback();
    }
    now = target;
    await settle();
  };

  globalThis.window = {addEventListener() {}, removeEventListener() {}};
  const {QueryClient, QueryObserver, environmentManager} = await import(entry);
  // Run as in a browser: on a server (no window) observers schedule no
  // staleTime or refetchInterval timers.
  environmentManager?.setIsServer(() => false);
  const out = {};
  // An unused query with gcTime of 30 days, the kind of value set to keep a
  // persisted cache: kept a day later, collected after 30 days.
  {
    const client = new QueryClient({defaultOptions: {queries: {gcTime: 30 * DAY}}});
    const observer = new QueryObserver(client, {queryKey: ['todos'], queryFn: async () => ['a']});
    const unsubscribe = observer.subscribe(() => {});
    await advance(10);
    unsubscribe();
    await advance(DAY);
    out.cachedAfterOneDay = client.getQueryCache().getAll().length;
    await advance(29 * DAY);
    out.cachedAfterThirtyDays = client.getQueryCache().getAll().length;
    client.clear();
  }
  // A refetchInterval of 30 days: fetches during the first second, and (when
  // the interval is not firing every millisecond) after 30 days.
  {
    let fetches = 0;
    const client = new QueryClient();
    const observer = new QueryObserver(client, {queryKey: ['report'], queryFn: async () => ++fetches, refetchInterval: 30 * DAY});
    const unsubscribe = observer.subscribe(() => {});
    await advance(1000);
    out.fetchesInFirstSecond = fetches;
    if (fetches === 1) {
      await advance(30 * DAY);
      out.fetchesAfterThirtyDays = fetches;
    }
    unsubscribe();
    client.clear();
  }
  // Parent renders replace option objects without postponing the poll deadline.
  {
    let fetches = 0;
    const client = new QueryClient();
    const options = {queryKey: ['poll'], queryFn: async () => ++fetches, refetchInterval: 1000};
    const observer = new QueryObserver(client, options), stop = observer.subscribe(() => {});
    await advance(0);
    for (let i = 0; i < 10; i++) {await advance(100); observer.setOptions({...options});}
    out.pollAfterRenders = fetches; stop(); client.clear();
  }
  return out;
}

if (process.argv[2] === '--child') {
  child(process.argv[3]).then(result => { process.stdout.write(JSON.stringify(result)); process.exit(0); }, error => { process.stderr.write(error.stack); process.exit(1); });
} else {
  const results = {};
  for (const [library, entry] of Object.entries(entries)) {
    const run = spawnSync(process.execPath, [__filename, '--child', entry], {encoding: 'utf8', timeout: 120000, env: {...process.env, NODE_ENV: 'production'}});
    assert.equal(run.status, 0, library + '\n' + run.stderr);
    results[library] = JSON.parse(run.stdout);
  }
  assert.equal(results.upstream.pollAfterRenders, 2);
  assert.equal(results.upstream.cachedAfterOneDay, 0, JSON.stringify(results));
  assert.ok(results.upstream.fetchesInFirstSecond > 100, JSON.stringify(results));
  assert.deepEqual(results.vpm, {cachedAfterOneDay: 1, cachedAfterThirtyDays: 0, fetchesInFirstSecond: 1, fetchesAfterThirtyDays: 2, pollAfterRenders: 2});
  // Declarations: a project compiled without DOM or Node types (a worker, or a
  // server build with "types": []) could not compile against AbortSignal and
  // VoidFunction.
  const fs = require('node:fs'), os = require('node:os'), {compile} = require('../platform-types.cjs');
  const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'tanstack-query-types-'));
  const diagnostics = {};
  try {
    for (const [library, entry] of Object.entries(entries)) {
      const file = path.join(consumer, library + '.ts');
      fs.writeFileSync(file, `import {QueryClient} from ${JSON.stringify(entry)};\nexport const client = new QueryClient();\n`);
      for (const lib of [['ES2022'], ['ES2022', 'DOM']]) {
        diagnostics[library + (lib.length > 1 ? '+dom' : '')] = compile({files: [file], compilerOptions: {strict: true, noEmit: true, target: 'ES2022', lib, types: [], module: 'NodeNext', moduleResolution: 'NodeNext', skipLibCheck: false}}).output.match(/error TS\d+: [^\n]*/g) || [];
      }
    }
  } finally {
    fs.rmSync(consumer, {recursive: true, force: true});
  }
  assert.ok(diagnostics.upstream.some(error => /Cannot find name 'AbortSignal'/.test(error)) && diagnostics.upstream.some(error => /VoidFunction/.test(error)), JSON.stringify(diagnostics));
  assert.deepEqual([diagnostics['upstream+dom'], diagnostics.vpm, diagnostics['vpm+dom']], [[], [], []]);
  console.log(`Reproduced and fixed: declarations that need DOM types (${diagnostics.upstream.length} errors without them), gcTime of 30 days collected an unused query at once (kept a day, collected at 30 days here), and refetchInterval of 30 days fetched ${results.upstream.fetchesInFirstSecond} times in the first second (once, then again at 30 days, here).`);
}
