# vp-limit

Promise concurrency control targeting **p-limit 7.3.3**, using only
[`vyocto-queue`](../vyocto-queue). Verified on Node.js 24 and Bun, including current
Cloud Storage callers that still install p-limit 3.1.0.

```js
import pLimit, {limitFunction} from 'vp-limit';
const limit = pLimit({concurrency: 4, rejectOnClear: true});
const results = await limit.map(['a', 'b'], async (item, index) => ({item, index}));
const limited = limitFunction(async value => value * 2, {concurrency: 2});
console.log(await limited(3)); // 6
```

CommonJS exposes the callable factory through `require('vp-limit')`, with
`limitFunction` as a property. Types support both module styles, synchronous and
promise-returning tasks, argument inference and array-like mapping inputs.

## Behavior

- `pLimit(number)` or `pLimit({concurrency, rejectOnClear?})` creates a limiter.
  Concurrency is a positive integer or `Infinity`; invalid values throw.
- `limit(fn, ...args)` returns the task result as a promise. Tasks always start
  asynchronously, run FIFO and retain the submitting caller's async context.
  Throws, rejected promises and thenables release their slots correctly.
- `activeCount` counts reserved slots, including tasks scheduled to start in a
  microtask. `pendingCount` counts queued tasks. Both are read-only.
- Setting `concurrency` changes future scheduling. Increasing it dispatches queued
  work in a microtask; reducing it lets already active work finish.
- `clearQueue()` discards pending work. By default, its promises remain unresolved,
  matching upstream. Prefer `rejectOnClear: true` when awaiting these promises:
  discarded tasks then reject with an `AbortError`. Active tasks are unaffected.
- `limit.map(iterable, mapper)` passes each value and index, preserving result
  order. It also accepts array-like inputs. If iteration throws, the returned
  promise rejects immediately; scheduled tasks still run and their rejections
  remain observed. Detached `map` calls share the same limiter.
- `limitFunction(fn, options)` returns a function with its own limiter and a
  `clearQueue()` method. Calls forward arguments without an extra task closure.

An available slot avoids an intermediate promise and queue record. Contended work
uses VPM's FIFO queue while preserving caller context and settlement ordering.
These optimizations retain upstream's queue-clearing and iterator-error safeguards.

A concurrency limit does not bound the number of pending tasks. `map` eagerly
consumes its input, and recursively awaiting the same saturated limiter can deadlock.
Clearing the queue does not cancel active I/O. These are upstream API constraints.

## Evidence

Fifteen focused tests cover scheduling, context, controlled concurrency changes,
thenables, failures, clearing and large batches. All 30 retained upstream cases
pass on both runtimes with the documented fixture adaptations. Actual Storage
8.4.0 delete, permission-change, upload and download methods execute 125 tasks
through six instrumented limiters. The same caller checks run against installed
p-limit 3.1.0 and current 7.3.3. This verifies those caller paths, not every old-major
behavior or live cloud deployment.

See the [conformance fixture](../../scripts/queue-limit-conformance/README.md) and
[paired benchmarks](bench/results/README.md). MIT; source origins and attribution
are retained in [PROVENANCE.json](PROVENANCE.json) and [LICENSE](LICENSE).
