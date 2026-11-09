# vmotion-dom

Independent numeric animation playback, values and scheduling targeting **motion-dom 14.7.0**, with
12.36.0 as the application's comparison control. This is a partial implementation
of Motion DOM; DOM rendering and inertia are still to be built.

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
animation controller, including the numeric `animateValue` controller below.
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

## Numeric playback

`keyframes(options)` returns a numeric generator with `next(milliseconds)`.
`animateValue(options)` and `new JSAnimation(options)` drive numeric tweens through
VPM's frame scheduler, or a supplied driver for deterministic clocks. They support
explicit keyframe offsets, easing curves/functions per segment, delays (including
negative delay), loop/reverse/mirror repeats, repeat gaps and infinite repeats.

These are low-level Motion DOM APIs: **duration, delay, repeatDelay and generator
samples use milliseconds**. The controller's `time`, `duration` and
`iterationDuration` use seconds. The higher-level Motion/React transition API is
not implemented yet.

```js
import { animateValue, motionValue } from "vmotion-dom";
const opacity = motionValue(0);
const finished = opacity.start(done => animateValue({
  keyframes: [0, 1], duration: 300, ease: "linear",
  onUpdate: value => opacity.set(value), onComplete: done,
}));
await finished;
```

Controllers expose `play`, `pause`, bound `stop`, `cancel`, `complete`, `speed`,
`time`, `finished` and `then`. Stops are terminal; cancellation resets the first
keyframe and permits replay. `sampleAt(timestamp)` reads without notifying or
moving the playhead; `sample(milliseconds)` is an explicit sample that updates
subscribers. Resolved numeric keyframes are required; unresolved nulls, colors
and strings are rejected. Inputs and easing/offset arrays are owned snapshots.

Deliberate differences from the controls:

- Changing playback direction with a delay preserves the current value. Both
  controls jump because they apply the delay with the opposite sign.
- Pausing removes scheduled frame work; paused frames do not republish unchanged
  values. `autoplay: false` does not start a driver.
- Seeking and explicit completion apply immediately, including while paused.
  Cancel always restores the first keyframe, even with a negative delay.
- Callback failures release the driver. A callback that pauses, cancels or seeks
  during the final tick cannot accidentally complete the newer state. Recursive
  completion/cancellation is bounded, and an overflowing seek leaves state intact.
- Sampling reports completion for the entire repeated animation. Both controls'
  `sample()` reports individual generator completion during repeat gaps.

## Springs

`spring(options)` solves the damped oscillator directly: stiffness, damping, mass,
initial velocity and both rest thresholds. It supports underdamped, critically
damped and overdamped motion, without numerical integration drift. `next(ms)`
returns value/completion; `velocity(ms)` returns the analytic derivative in units
per second. Sampling order is independent. `retarget([from, to], velocity)`
starts a new trajectory at time zero and keeps the physical configuration.

`animateValue({ keyframes: [0, 1], type: "spring", stiffness: 550, damping: 30,
restSpeed: 10 })` supports the calendar's scale transition. `type: spring` also
works. Springs share tween playback controls, delays and repeat modes. A repeat
gap holds the settled endpoint instead of resuming an oscillation. Undamped
springs can be cancelled or explicitly completed; ones with no detected settling
point cannot repeat or restart backwards from their endpoint.

Without explicit physical coefficients, `duration` (milliseconds) and `bounce`
select a duration-calibrated spring. Duration is bounded to 10–10000 ms, as in the
controls. `visualDuration` uses seconds; negative bounce produces an overdamped
curve. Physics coefficients take precedence. Time-calibrated springs start with
zero velocity, matching the controls. Standalone `visualDuration` is honored;
both controls ignore it unless another time option is present. The numeric
shorthand `spring(0.3, 0.3)` means a 0.3-second visual-duration generator.

Default physics coefficients are stiffness 100, damping 10 and mass 1. For a
travel distance below 5, rest thresholds are 0.005 distance and 0.01 speed;
otherwise they are 0.5 and 2, matching the controls. Rest requires both thresholds.
`calcGeneratorDuration(generator)` samples every 50 ms up to 20 seconds and
returns Infinity if no rest point is detected. Playback uses that bounded estimate
for repeat timing; a single spring can finish on its actual frame's rest condition.
The generator's own physical `calculatedDuration` stays null. CSS `toString` and
`toTransition` serialization are outside this implementation.

[Spring measurements](bench/spring/README.md) cover the calendar configuration,
combined value/velocity sampling, time calibration, controller setup and playback.
Calendar spring construction takes about 80% less time on Node and 52% less on
Bun; duration calibration takes 92% and 83% less. Repeated spring playback takes
21% and 45% less time. Node controller setup is 26% lower, while Bun's difference
is unestablished. Combined value/velocity sampling still costs about 24 ns more
on Node (68 ns versus 44 ns, 54%); Bun's sampling difference is unestablished.
All process samples and identical-source controls are retained.

## Still to build

DOM effects and animation adapters come next. Inertia, CSS spring serialization,
color/complex-string mixers,
grid/random staggering, WAAPI, gestures/layout and the React renderer remain
unimplemented. Unsupported inertia and grid/random staggering reject
explicitly. This package must not replace `motion-dom` under Framer Motion yet.
VentiMath's timed contest fades and spring-based calendar/header transforms are
the playback targets. Application adoption is not claimed.

[Conformance](../../scripts/motion-dom-conformance/README.md) compares numeric
contracts against current and application controls, with separate correctness
checks, strict types and packed installs. [Measurements](bench/results/README.md)
use isolated processes and identical-source controls. These scalar timings do not
establish an application frame-rate improvement.

[Value and frame measurements](bench/values/README.md) are recorded separately
from the numeric mapping suite. Both use fresh processes, balanced order and
identical-source controls. These primitive timings do not establish application
frame-rate gains; remaining costs are reported alongside improvements.

The value/frame recording finds lower creation time on Bun (about 33%) and lower
schedule/cancel time on Node/Bun (16%/10%). Node creation and subscriber-update
differences are unestablished against process/control variation. Dispatching 32
callbacks costs about 0.21 microseconds more on Node and 0.15 microseconds more on
Bun (20%/13%); cancellation and exception recovery remain enabled. The report keeps
all samples and does not turn these microbenchmarks into an application claim.

Numeric mapping and timeline preparation remain lower-time cases on both
runtimes. The re-recorded Bun list-stagger case is 11% higher (about 9 ns per
20-item batch); the full numeric report includes this remaining regression.

[Playback measurements](bench/playback/README.md) cover numeric generator
construction/sampling, creation and disposal of paused controllers, and repeated
frame delivery. Each worker uses the same clock and driver contract; the
construction case disposes controllers instead of accumulating queued work.

The playback recording finds 51% lower per-frame time on Node and 60% on Bun.
Node generator construction and controller creation/disposal are 90% and 57%
lower. Bun generator sampling is 22% lower; its construction difference is
unestablished against control variation. Bun controller creation/disposal has a
higher paired median (43%, 118 ns versus 84 ns), but the controls are too noisy to
establish a direction in this recording. Node sampling is also unestablished.
These measurements describe numeric primitives, not application frame-rate
gains; all control noise and outliers remain in the reports.
