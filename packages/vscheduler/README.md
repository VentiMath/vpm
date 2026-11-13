# vscheduler

Independent, dependency-free cooperative scheduling targeting **scheduler 0.28.0**
and its React DOM **19.3.1** caller. Supports all sixteen root exports. It is built
and tested; VentiMath adoption and publication are separate steps.

```js
import { unstable_scheduleCallback, unstable_NormalPriority,
  unstable_cancelCallback } from 'vscheduler';
const task = unstable_scheduleCallback(unstable_NormalPriority, didTimeout => {
  // Perform a bounded unit of work. Return another callback to continue later.
});
unstable_cancelCallback(task);
```

Immediate, user-blocking, normal, low and idle work is ordered by expiration,
with FIFO order for equal deadlines. Delayed tasks become eligible at their start
time. A continuation preserves its original priority and deadline but yields a
host turn. Callbacks receive `didTimeout`; expired work is allowed to finish even
after the ordinary time slice. `unstable_shouldYield` and `unstable_requestPaint`
let cooperative callers leave room for other work. Arbitrary synchronous code
cannot be interrupted.

Priority context is restored after normal returns and errors. `unstable_next`
lowers urgent contexts to normal, and `unstable_wrapCallback` captures the current
priority while retaining arguments, `this` and return values. Callback failures
escape to the host; unrelated scheduled work remains runnable.

## Deliberate differences

- Cancelling queued work removes it from its indexed heap immediately, releases
  its callback, and cancels or moves an obsolete delayed wakeup. No cancelled
  task remains until its original delay expires.
- Cancelling the currently executing task also suppresses a returned
  continuation. Upstream runs that continuation despite the cancellation.
- Very long delays are split into safe host timer waits, avoiding 32-bit timer
  overflow. Infinite delays and non-function callbacks reject before scheduling.
- Unsupported priority numbers normalize to normal priority. Task handles are
  opaque; internal fields are not an API. Invalid frame-rate values leave the
  previous slice unchanged and report an error.

Import creates no timers or message channels. Node and Bun use `setImmediate`;
browsers lazily create a `MessageChannel`; a timer-only host also works. The
ordinary time slice is five milliseconds and `unstable_forceFrameRate` can adjust
it. Profiling is `null`, matching the ordinary upstream build. The test-only
`unstable_mock`, experimental `unstable_post_task`, native entry and profiling
build are outside this package's scope.

[Verification](../../scripts/scheduler-conformance/README.md) covers deterministic
traces, actual React DOM transitions/Suspense/hydration in Chrome, strict public
types, and fresh/frozen npm/Bun packed consumers.
[Measurements](bench/results/README.md) retain isolated process samples and
controls. These are scheduler workloads, not application speed claims.
[Provenance](PROVENANCE.json) records the independent implementation and caller.
