# vmotion-dom

Independent DOM effects, numeric transition adapters, playback, values and scheduling targeting **motion-dom 14.7.0**, with
12.36.0 as the application's comparison control. This is a partial implementation
of Motion DOM; element animation adapters, inertia and the React renderer remain to be built.

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
`iterationDuration` use seconds. The numeric `animateMotionValue` adapter below accepts public transition options
in seconds; the full Motion/React renderer is not implemented yet.

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

## Numeric transition adapter

`animateMotionValue(name, value, target, transition)` returns a factory for
`MotionValue.start()`. It connects public Motion transitions to the numeric
controllers without a DOM resolver:

```js
const scale = motionValue(0);
const detach = styleEffect(element, { scale });
await scale.start(animateMotionValue("scale", scale, 1, { delay: 0.3 }));
detach();
```

`duration`, `delay` and `repeatDelay` use **seconds**; `elapsed` uses milliseconds.
Property-specific and `default` options select the transition; an outer delay is
inherited unless the selected options override it. `getValueTransition`,
`getDefaultTransition` and `isTransitionDefined` expose those selection rules.
Transform properties default to springs; opacity and other numeric properties
use a 0.3-second eased tween, and longer keyframe lists use 0.8 seconds. Explicit
transition options use Motion's ease-out fallback. These rules are compared with
both current and app-pinned Motion, including scale-to-zero critical damping.

Targets can be a number or numeric keyframe array. An initial `null` resolves
from `from` or the value at start; subsequent nulls repeat the preceding keyframe.
An explicit first keyframe takes precedence over `from`. Targets, offsets, easing
arrays and selected options are captured before starting; current value and
velocity are read when the factory runs. Updates reach the MotionValue before
`onUpdate`; its completion callback runs before transition `onComplete`.
The existing stop, callback-failure and first-frame spring-rest behavior remains.
No temporary browser globals are required by the VPM implementation.

This adapter supports finite numeric values only. DOM measurement, complex
strings, handoff, `animateSingleValue` and full element animation remain outside
its declared surface. Unsupported element/handoff arguments reject explicitly.
[Transition measurements](bench/transitions/README.md) cover controller creation
and repeating value delivery; they do not measure the full React caller. Repeating
opacity delivery takes 61% less time on Node and 57% less on Bun in the current
recording. Node calendar-scale setup takes 27% less time; other setup differences
are unestablished against process/control variation. All samples are retained.

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

## DOM effects

`styleEffect`, `attrEffect`, `svgEffect` and `propEffect` bind MotionValues to
styles, attributes, SVG drawing properties or object properties. Initial values
and subsequent changes paint during the render phase. Repeated changes coalesce;
transforms and SVG path properties share one composed write per element.

```js
import { motionValue, styleEffect, animateValue } from "vmotion-dom";
const scale = motionValue(0);
const detach = styleEffect(element, { scale });
const animation = animateValue({
  keyframes: [0, 1], type: "spring", stiffness: 550, damping: 30, restSpeed: 10,
  onUpdate: value => scale.set(value),
});
// When the owning view unmounts:
animation.stop();
detach();
```

Style bindings handle numeric units, opacity bounds, CSS variables, explicit
transform strings, independent transforms in a stable order, and transform
origins. String values pass through, including CSS expressions and colors;
color-object conversion and interpolation are not implemented here. SVG bindings
route supported styles through `.style`, use `attrWidth`/`attrX` for forced
attributes, and normalize `pathLength`, `pathSpacing` and `pathOffset` for drawing.
Attribute bindings use an existing JavaScript setter when available and normalize
camel-case `aria`/`data` names. Object-property bindings preserve the exact value.

DOM effects accept an element, element collection or selector. `resolveElements`
also accepts a scoped root and selector cache. Elements from another document
work directly: both controls require wrapping those elements in an array.

Each effect exposes `get(subject, key)`, `flush(subject)` and `state(subject)`;
the state exposes `get`, `flush` and `release`. `releaseElement(element)` detaches
style/SVG bindings, returns their MotionValues and clears retained transform
components for the next renderer. `styleSubjectEffect` and `svgSubjectEffect`
share the corresponding binding stores. Public effect registration, custom
`createEffect`/`MotionValueState` construction and computed-style reads are not
implemented yet; the declarations expose this bounded surface.

Cleanup is idempotent and preserves the last paint. Removing a transform binding
freezes that component while other components continue. A stale cleanup cannot
remove a newer binding, even if it reused the same MotionValue. Cancelling before
first paint suppresses queued writes. Invalid maps are checked before attachment;
nonfinite numeric styling rejects without preventing other queued writes or
future frames. As with upstream, cleanup stops observation; it does not restore
styles that predated the effect.

[DOM effect measurements](bench/effects/README.md) cover binding/initial paint,
scalar updates, composed transforms, 32-element fan-out and SVG path updates.
These measure JavaScript scheduling and serialization with lightweight element
sinks; Chrome conformance checks real styles separately. They do not measure
browser layout, paint or application frame rate.

The Bun scheduling bottleneck was a repeated lookup of an absent browser global,
plus wakeup setup in manual/server frames. The scheduler now checks the global
property directly and skips unavailable requests. Transforms compose from owned
binding slots without per-frame lookup arrays or temporary unit strings. Finite
value validation, cancellation, replacement ownership and late browser setup
remain tested.

[Before/after measurements](bench/effects-previous/README.md) against commit
`88dea27f` show Bun transforms falling from 351 to 174 ns (52% less time), and
32-element updates from 3.64 to 1.74 μs (52% less). Both improvements hold across
all process pairs beyond control variation. Against upstream, the current Bun
transform and fan-out differences are unestablished; their medians are near
parity. Node transforms and fan-out take 35% and 33% less time than upstream.
Bun SVG path updates still have a higher median (274 versus 229 ns), although
this recording does not establish the direction beyond control variation.
Binding and most other effect differences are also unestablished. The broader
scheduler benchmark still shows 32-callback dispatch taking 19% more time on Node
and 14% more on Bun; that workload is separate from coalesced DOM effects. The
reports retain all samples and do not claim universal speed gains.

## Still to build

Element animation adapters and computed-style/keyframe resolution come next.
Inertia, CSS spring serialization, color/complex-string mixers, grid/random
staggering, WAAPI, gestures/layout and the React renderer remain
unimplemented. Unsupported inertia and grid/random staggering reject
explicitly. This package must not replace `motion-dom` under Framer Motion yet.
VentiMath's timed contest fades and spring-based calendar/header transforms are
the playback targets. Application adoption is not claimed.

[Conformance](../../scripts/motion-dom-conformance/README.md) compares the implemented
contracts against current and application controls, with separate correctness
checks, strict types, Chrome and packed installs. Each benchmark suite uses fresh
processes, balanced order and identical-source controls, retaining all samples and
reporting remaining costs alongside improvements. These primitive timings do not
establish an application frame-rate improvement.

| Measurements | Work covered |
| --- | --- |
| [Numeric transitions](bench/transitions/README.md) | Public seconds-based options, property defaults and value delivery |
| [DOM effects](bench/effects/README.md) | Binding, painting, cleanup, transforms, fan-out and SVG paths |
| [Springs](bench/spring/README.md) | Construction, calibration, value/velocity sampling and repeated playback |
| [Numeric playback](bench/playback/README.md) | Keyframe generators, controller lifetime and frame delivery |
| [Values and frames](bench/values/README.md) | Value creation/notification, scheduling, dispatch and cancellation |
| [Numeric mapping](bench/results/README.md) | Interpolation, timeline lookup/preparation and list staggering |
