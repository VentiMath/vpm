# vmotion-dom

Independent animation values, scheduling and numeric primitives targeting **motion-dom 14.7.0**, with
12.36.0 as the application's comparison control. This is a partial implementation
of Motion DOM; animation playback and DOM rendering are still to be built.

```js
import { interpolate, stagger } from "vmotion-dom";
const opacity = interpolate([0, 0.5, 1], [0, 0.3, 1]);
const delay = stagger(0.05, { from: "center" });
opacity(0.25); // .15
delay(0, 5); // .1 seconds
```

## Implemented

- `mixNumber(from, to, progress)` blends two numbers, including extrapolation.
- `interpolate(input, output, options)` maps numeric keyframes, supporting
  descending ranges, duplicate boundaries, clamping, extrapolation and per-segment
  easing. Non-numeric outputs need an explicit `mixer` factory.
- `stagger(duration, options)` maps list indices to delays: first, last, center,
  edges or a numeric origin, optional starting delay and Motion easing definitions.

Interpolation snapshots the ranges and easing list. Mutating the caller's arrays
does not change an existing timeline. Custom mixer outputs are shallow snapshots;
the caller's factory owns how object values are captured. Invalid, empty, mismatched,
non-finite or non-monotonic numeric ranges reject during construction. Long ranges
use binary segment lookup. The runtime is independently authored and depends only
on `vmotion-utils`.

## Values and frames

`motionValue(initial)` and `MotionValue` expose value reads/writes, previous values,
frame-based velocity, explicit velocity, jumps, passive effects, change/lifecycle
subscriptions, dependent invalidation and cleanup. `start(factory)` owns an
externally provided animation controller; it does not yet create animations.
`get()` supports a controller's optional live-value hook without overwriting the
stored value. Numeric and unit-string velocity expires after 30 ms; invalid
explicit durations reject, and backward elapsed time reports zero velocity.

`frame` schedules setup, read, keyframe resolution, pre-update, update, pre-render,
render and post-render phases. It deduplicates callbacks, supports keep-alive work,
and coalesces browser requests. `cancelFrame`, `frameSteps`, `frameData`,
`createRenderBatcher`, `processFrame`, `time`, `microtask` and `cancelMicrotask`
provide the corresponding primitives. Server imports create no timers.
With `MotionGlobalConfig.useManualTiming`, `processFrame(timestamp)` uses the
supplied clock and its exact delta; automatic frames bound deltas to 1–40 ms,
starting/resuming with 1/60 second.

Correctness changes are explicit:

- Cancelling during a phase suppresses a callback that has not run yet.
  Immediate self-rescheduling is bounded to once per phase per frame.
- A throwing callback does not leave the scheduler stuck. Remaining callbacks and
  phases run, state is released, then the first error is rethrown.
- Synchronous completion emits start before completion. A cancelled animation's
  late completion cannot emit a success event. Start-hook and teardown failures
  release the controller, listeners and passive effect.
- Removing the last value observer stops animation on the next read phase;
  resubscribing in the same frame keeps it alive. `start()` promises resolve on
  completion, not simply on cancellation.

## Still to build

Numeric animation playback comes next, followed by DOM effects. Color/complex-string mixers, grid/random staggering, WAAPI,
gestures/layout and the React renderer remain unimplemented. Unsupported grid and
random staggering reject explicitly. This package must not replace `motion-dom`
under Framer Motion yet. VentiMath's contest fades, calendar and directory headers
are the intended callers; their adoption is not claimed.

[Conformance](../../scripts/motion-dom-conformance/README.md) compares numeric
contracts against current and application controls, with separate correctness
checks, strict types and packed installs. [Measurements](bench/results/README.md)
use isolated processes and identical-source controls. These scalar timings do not
establish an application frame-rate improvement.

[Value and frame measurements](bench/values/README.md) are recorded separately
from the numeric mapping suite. Both use fresh processes, balanced order and
identical-source controls. These primitive timings do not establish application
frame-rate gains; remaining costs are reported alongside improvements.

The value/frame recording finds lower creation time on Bun (about 35%) and lower
schedule/cancel time on Node/Bun (18%/12%). Node creation and subscriber-update
differences are unestablished against process/control variation. Dispatching 32
callbacks costs about 0.21 microseconds more on Node and 0.16 microseconds more on
Bun (19%/13%); cancellation and exception recovery remain enabled. The report keeps
all samples and does not turn these microbenchmarks into an application claim.

Numeric mapping and timeline preparation remain lower-time cases on both
runtimes. The re-recorded Bun list-stagger case is 9% higher (about 7 ns per
20-item batch); the full numeric report includes this remaining regression.
