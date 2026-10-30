# vretry

Retry schedules and callback operations targeting **retry 0.13.1**, the stable
upstream release checked on October 30, 2026. Zero runtime dependencies;
CommonJS, native ES imports and bundled TypeScript declarations. Verified on
Node.js 24 and Bun. [`vasync-retry`](../vasync-retry) uses this primitive for
Google Cloud Storage's multipart retry paths.

```js
import {operation} from 'vretry';
const op = operation({retries: 3, minTimeout: 100, maxTimeout: 1000});
op.attempt(attempt => {
  readRemoteValue((error, value) => {
    if (error && op.retry(error)) return;
    op.stop();
    complete(error ? op.mainError() : null, value);
  });
});
```

`readRemoteValue` and `complete` above represent application callbacks.
`require('vretry')` exposes the same named functions.

## Upstream baseline and fixes

| Behavior in retry 0.13.1 | VPM behavior |
| --- | --- |
| `reset()` restores delays but leaves error history and pending timers. | Cancels both timers, clears errors and attempt state, and invalidates old timer callbacks. |
| `mainError()` counts messages in an ordinary object; names such as `__proto__` produce incorrect results. | Prototype-free string counts, with identity-based counting for other keys; the latest error wins frequency ties. |
| A zero `maxRetryTime` becomes an unlimited budget; a delay may be scheduled beyond the remaining budget. | Honors zero, checks the planned delay against a monotonic budget, and records `ERR_RETRY_TIMEOUT` when no retry fits. |
| Invalid numeric options can cause unbounded allocation or native timer overflow. | Validates options before allocation; splits long delays across safe timer intervals. |
| Repeated callback invocations can schedule extra attempts or complete a wrapped method more than once. | Each wrapped attempt accepts one callback; stale and duplicate completions are ignored. |
| Automatic `wrap()` selection visits inherited methods and evaluates accessors. | Selects own enumerable data functions, preflights replacements, and snapshots options. |

The [conformance fixture](../../scripts/retry-conformance/README.md) reproduces
upstream failures separately from expected compatibility behavior. These changes
improve retry lifecycle handling; they do not make an application's operation
idempotent or cancel its active network work.

## API and intentional differences

- `timeouts(options)` builds the sorted exponential schedule; `createTimeout(n,
  options)` calculates one delay using the upstream rounding, cap and optional
  1–2× random multiplier. A supplied delay array is copied without reordering.
- Defaults: ten retries, factor 2, minimum 1000ms, unlimited maximum and total
  budget, `randomize: false`, `forever: false`, `unref: false`.
- `retries` accepts an integer from 0 to 100,000, `null` for zero, or `Infinity`.
  Infinity uses a finite ten-delay ramp, then repeats its last delay. `forever`
  also repeats the final delay and retains only the most recent failure.
- The factor must be finite and positive; delays must be nonnegative. Generated
  and custom delays cannot exceed `Number.MAX_SAFE_INTEGER`. `maxTimeout` and
  `maxRetryTime` accept Infinity. Boolean fields require booleans. Invalid inputs
  throw instead of relying on coercion. Public option factories read own fields
  once; inherited configuration is ignored.
- `operation(optionsOrDelays)` creates a `RetryOperation`. `attempt(fn,
  {timeout, cb}?)` starts immediately with attempt number 1. Per-attempt timeout
  callbacks receive no argument initially and the attempt number subsequently.
  `unref` applies to both timeout and backoff handles.
- `retry(error)` returns whether another attempt is scheduled. A falsy error
  ends the operation; a duplicate call while a retry is pending adds no work.
  Call `attempt` before retrying. `stop()` is terminal until `reset()`.
- `attempts()`, `errors()` and `mainError()` expose current state. `errors()`
  retains the upstream mutable-array API. `reset()` makes the operation reusable.
  Deprecated `try()` and `start()` aliases remain callable without warnings.
- `wrap(object, options?, methods?)` replaces callback methods. Explicit method
  names may select inherited data functions or symbols. Calls retain the original
  owner and callback receiver/arguments; synchronous exceptions remain synchronous.
  Each wrapper exposes its frozen option snapshot as `.options`.
- `RetryOperation` is a named export; the historical `lib/retry_operation` and
  `lib/retry` import paths, with or without `.js`, also work.

The total retry budget is checked when scheduling. It does not interrupt an
active attempt or enforce a hard deadline while the event loop is blocked.
Application cancellation must stop both the operation and its I/O. The API has no
attempt-specific completion token, so direct callers must coordinate late
callbacks themselves; `wrap` provides that guard for callback methods.

## Evidence and performance

Twenty focused tests cover schedules, validation, error accounting, cleanup,
clock changes, long timers, callback receivers and duplicate completions. All
**26 retained upstream cases** pass against both implementations on both
runtimes, with the fixture's documented adaptations. The Storage caller suite
also drives this scheduler through `vasync-retry`.

[Paired measurements](bench/results/README.md) retain raw samples, source hashes,
three fresh processes and an identical-upstream control per runtime. Setup and
error-accounting tradeoffs are reported alongside faster paths. These are local
CPU measurements, not evidence of faster cloud requests.

MIT. [PROVENANCE.json](PROVENANCE.json) records the exact upstream commit,
package integrity, changes and source manifest; [LICENSE](LICENSE) preserves
attribution.
