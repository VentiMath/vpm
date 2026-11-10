# vmotion-dom

Independent element reads, keyframe resolution, DOM effects, numeric transitions, playback and scheduling targeting **motion-dom 14.7.0**, with
12.36.0 as the application's comparison control. This is a partial implementation
of Motion DOM; inertia and the React renderer remain to be built.

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

Without an owner the adapter retains its fast finite-numeric path. Supply an
`AnimationElement` as the fifth argument to resolve DOM units, variables and
measured lengths, or its custom `KeyframeResolver` class. This returns a factory
for the caller's `MotionValue.start()`; it never starts a second lifecycle.
Reusable factories own target/options snapshots and resolve fresh origins on each
start. Renderer skip/reduced-motion flags are honored. The optional sixth
`isHandoff` argument uses immediate base resolution without custom DOM reads;
like upstream, its explicit `from` overrides the first keyframe. This is a JS
playback path, not WAAPI or a complete optimized-appearance/hydration system.
[Transition measurements](bench/transitions/README.md) cover controller creation
and repeating value delivery; they do not measure the full React caller. Repeating
opacity delivery takes 61% less time on Node and 57% less on Bun in the current
recording. Node calendar-scale setup takes 27% less time; other setup differences
are unestablished against process/control variation. All samples are retained.

## Single-value animations

`animateSingleValue(numberOrMotionValue, target, options)` is the public numeric
entry above the transition adapter. It returns the same playback controls and
accepts transition times in seconds:

```js
const progress = motionValue(0);
await animateSingleValue(progress, 1, { duration: 0.3 }).finished;
```

It validates the replacement controller before stopping an existing animation.
MotionValue start/completion events retain their ordering, and listener failures
are observable through `finished`. Stopping or cancelling settles playback even
though a cancelled `MotionValue.start()` promise does not report successful
completion. Replays use a fresh completion promise. Paused construction has no
frame side effects. Strings, objects and color interpolation remain unsupported.

[Single-value benchmarks](bench/single/README.md) cover creation/replacement and
repeated value delivery; they do not measure React rendering or browser paint.
Repeating updates take 38% less time on Node and 51% less on Bun in the final
recording. Final setup comparisons on both runtimes are unestablished against
process/control variation. The focused optimization in commit `780bbd7f` reduced
Bun setup by [25–26% against the preceding VPM implementation](bench/single-previous/README.md).
That before/after report retains its own source hashes; it is not a new timing of
the later element API integration.

Preparation avoids redundant option copies, while preserving owned snapshots and
validation before replacement. Playback completion promises are created only
when observed; late access, cancellation and replay keep distinct lifetimes.
Lifecycle bookkeeping stays off the numeric controller's hot object shape.

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
`createEffect`/`MotionValueState` construction are not
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

## Element reads and DOM keyframes

`readStyleValue`, `readSVGValue`, `readTransformValue` and `getComputedStyle`
read through the element's own window, including iframe elements. CSS units and
custom-property strings are preserved. SVG reads honor forced attribute names,
dash casing, literal SVG names and transform defaults. `parseValueFromTransform`
handles computed 2D/3D matrices; `defaultTransformValue` supplies identity values.

Unlike the controls, rotated 2D scale retains its magnitude and absent axes have
identity defaults. The decomposition is canonical: 2D rotation plus X skew,
positive X scale and reflection sign on Y. A matrix does not uniquely identify
its original transform function list. Simple 3D translation, scale, rotations
and perspective are supported; arbitrary combined 3D skew/reflection recovery
is outside this contract. Invalid matrices reject. A single-entry matrix cache
avoids repeated parsing without retaining an unbounded list of strings.

`KeyframeResolver` snapshots keyframes, resolves an initial null from a MotionValue
or element read, and fills later nulls from their predecessors. `DOMKeyframesResolver`
also resolves CSS variables (with bounded nested fallbacks), numeric strings and
mixed numeric/pixel endpoints. A final variable token is returned separately so
a caller can restore the CSS expression after playback. `fillWildcards` and
`applyPxDefaults` expose their corresponding in-place helpers.

DOM reads are scheduled; `flushKeyframeResolvers()` can force completion.
Resolvers support cancellation and resume, and completion is idempotent. A failed
read or callback does not strand other resolvers. New work queued by a completion
callback belongs to a later batch. Pure resolved endpoints can complete immediately.
VPM normalizes numeric strings; upstream's immediate path sometimes leaves them
as strings. Missing initial values fall back to the final target; entirely
unresolvable keyframes reject rather than silently retaining nulls.

Two-endpoint width/height/position changes can measure percentages, `auto` and
browser-resolved CSS lengths. Initial writes, reads, end writes and end reads are
batched, with conflicting measurements isolated. Owned inline properties and
`!important` priorities and window scroll positions are restored before callbacks,
including after failures.
Explicit percentage starting points are honored. X/Y translation percentages
use the untransformed border box; their mixed-unit measurement supports numbers,
pixels and percentages. More than two mixed-unit layout keyframes reject.
Non-positional colors/strings pass through for future mixers; complex `none`
normalization and general color/string interpolation remain unimplemented.

[Read/resolution benchmarks](bench/reads/README.md) measure JavaScript work with
computed-style sinks, not browser layout cost. Chrome separately verifies real
styles, SVG, percentages, auto dimensions, restoration and iframe reads. Earlier
suite recordings retain their recorded source hashes and dates; they are
historical measurements rather than new measurements of this addition.

Reading three components from a repeated matrix takes 97% less time on Node and
91% less on Bun. Variable endpoint resolution takes 46% less on Node. Its final
Bun comparison is unestablished (1,165 versus 1,043 ns, with 59% control variation).
Variable syntax uses a bounded one-entry cache; computed values are always read
fresh. Layout bookkeeping is allocated only when measurement is needed, and
resolver cancellation targets its own read phase. The earlier focused
[before/after recording](bench/reads-previous/README.md) has a 23% lower median,
but control variation prevents a firm directional claim. Scalar reads and owned
numeric resolution still have small overheads; see the complete report rather
than treating this as a universal speedup.

## Element animation APIs

`animateElement(element, keyframes, transition, renderer?)` connects the readers, resolvers,
controllers and HTML/SVG effects. It returns one playback controller per animated
property. `animateValues(getValue, keyframes, transition, resolverElement?)` uses
the same path with caller-owned MotionValues.

```js
const controls = animateElement(card, { opacity: 1, x: "40px" }, {
  duration: 0.3,
  ease: "easeOut",
});
await Promise.all(controls.map((animation) => animation.finished));
releaseElement(card);
```

Supported targets are numbers, matching CSS units, variables and two-keyframe
measured lengths such as percentage/auto widths. HTML styles and SVG attributes,
transforms and path drawing share the existing effect bindings. Completed
forward animations restore responsive variable/percentage/auto endpoints instead
of leaving a measured pixel constant. Per-property options, delays, repeats,
from/current origins, snapshots, tween/spring playback, seek, speed, pause,
cancel/replay and terminal stop are covered. The **element** controller's `time`
is total elapsed seconds including delay, matching upstream's element controls;
the low-level numeric controller retains its existing timing contract.

Pending reads can be cancelled without painting. A newer request supersedes an
older pending request; a failed deferred replacement leaves prior playback intact.
Reentrant start callbacks cannot reattach superseded controllers. `releaseElement`
cancels pending work, detaches effects and stops attached values. Explicit stopping
also removes a redundant deferred unobserved-value check. Promises and completion
handlers are allocated when observed, and shared render jobs are indexed once at
binding time rather than deduplicated on every explicit flush.

The implementation follows the public 14.7.0 API declarations and documented
contracts, with black-box comparison tests. The application control 12.36.0 does
not export these two APIs. [Element measurements](bench/elements/README.md) cover
setup, variable resolution and sixteen-element seeking using JavaScript style
sinks; Chrome separately verifies real DOM animation and layout. This does not
establish React integration or application frame-rate improvements.

Element setup now owns one option snapshot and one lifecycle facade, avoiding
repeated configuration copies and a second control wrapper. Caller snapshots,
validation before replacement and callback-failure propagation are retained.
A new regression covers completing synchronously inside an animation-start hook
without restarting playback or losing a responsive CSS endpoint.

The [earlier before/after measurements](bench/elements-previous/README.md) remain
historical recordings from commit `81abce79`. The refreshed element workload
records Node medians of 3.86 μs versus 2.56 μs upstream for fades and 4.65 versus
4.17 μs for variable widths. None of the Node directions is established beyond
process/control variation. Bun variable setup remains 67.5% more than upstream;
its fade and sixteen-element update directions are inconclusive. These setup
microbenchmarks do not establish application frame-rate changes.


## Renderer ownership transfer

`handOffElementState(element, renderer)` transfers the MotionValues currently
bound by `styleEffect`, `svgEffect` or a pending element animation into an existing
renderer. It preserves each value's identity, velocity, subscriptions and running
controller. Queued writes from the source effect are cancelled, and releasing the
old source does not stop the transferred animation. Pending DOM reads finish
through the destination without reattaching source bindings.

The destination must own the same element and provide `getValue`, `addValue` and
`removeValue`. Existing entries are replaced by the source values. Invalid
owners reject before detaching anything. If attachment throws, source bindings
remain active and previous destination entries are restored where its methods
permit rollback. Reentrant source additions are separate work and survive cleanup.

Pass the renderer as `animateElement`'s fourth argument for subsequent animations:
its values and renderer are reused, with no additional style effect. Newly created
values read from the DOM. Renderer `shouldSkipAnimations` and
`shouldReduceMotion` settings are honored. This does not implement VisualElement,
WAAPI or the full React integration. Custom resolver classes can extend the public `KeyframeResolver` or
`DOMKeyframesResolver`, including their protected keyframe/value state. Returned
arrays are copied before numeric conversion, so frozen or retained output stays
unchanged. Resolution can be synchronous or queued; stop/cancel suppress late
callbacks, and forced reads cooperate with the shared queue. Custom measurement
hooks restore state on failure. Foreign resolvers without transaction hooks get
an intermediate renderer paint and source value/style/scroll restoration.
Failures reject the controller's `finished` and, for VPM MotionValues, its owning
`start()` promise. Arbitrary resolvers must still honor the public constructor,
state, cancellation and measurement contract; complex resolved strings remain
outside the implemented mixers.

The bridge is verified with unchanged upstream HTML/SVG renderers in Chrome,
including iframe elements, plus 712 black-box comparisons per runtime and
regressions for pending transfer, replacement, rollback and stale cleanup.
[Handoff measurements](bench/handoff/README.md) time binding, ownership transfer
and disposal. Remaining Node medians are 1.16 μs versus 0.50 μs for one value and
7.48 versus 3.19 μs for eight values. Bun eight-value transfer takes 7.76 versus
4.74 μs. The balanced [before/after comparison](bench/handoff-previous/README.md)
with commit `112782a6` does not establish a speed change on either runtime.

Measurement guards live once per resolver class, with ownership stored in a private
instance field rather than a per-instance WeakMap entry. Guards capture their
phase method once; error routing remains independent for every resolver,
including constructor-time and instance-field failures. The balanced
[before/after comparison](bench/renderer-previous/README.md) against `d45f59d3`
finds lower synchronous setup time on Node and Bun (39.9% and 16.7% respectively).
Deferred setup changes are **unestablished** on both runtimes.

The [upstream comparison](bench/renderer/README.md) still finds deferred setup
costs: Node 2.71 versus 2.03 μs; Bun 4.01 versus 1.54 μs (about 2.6×).
The deferred facade, guarded resolver queue and owned playback lifecycle still
allocate more state; removing a weak-map entry did not close that gap.
Both synchronous upstream comparisons are inconclusive. These are local
microbenchmarks, not application frame-rate measurements.


## Groups and target completion

`GroupAnimation` and `GroupAnimationWithThen` accept arrays of playback controls
and omit `undefined` entries. Time and speed setters reach every member; getters
read the first member, while duration and iteration duration take the maximum.
`finished` waits for all current members. The thenable form can be awaited.
Groups own the input array, expose neutral empty-group getters and continue
cleanup after a child throws, then report the first error. Timeline attachment
forwards child adapters or uses `observe()` on paused controls; failed attachment
unwinds observers, and returned cleanup runs once. Native WAAPI/scroll timelines
are not implemented.

```js
import { animateTarget, GroupAnimation } from "vmotion-dom";
const group = new GroupAnimation(animateTarget(renderer, {
  opacity: 0,
  x: 30,
  transition: { duration: 0.2 },
  transitionEnd: { display: "none" },
}));
await group.finished;
```

`renderer` supplies `getValue`, `addValue`, optional initial `latestValues`, and
the existing renderer/keyframe-resolution contract. End values are scalar
strings or finite numbers. They are snapshotted and applied in an update frame
after every property completes. `finished` covers playback; the subsequent end
write and renderer paint run on their frames. Stop, cancel, failure and newer
requests suppress stale end writes, including replacement after completion but
before that frame. End-only targets work, and existing renderer/DOM values are preserved until completion. The lower-level `animateElement` and
`animateValues` still do not accept `transitionEnd`.

Renderer defaults, per-property options, `transitionOverride`, outer delay and
reduced/skip motion are supported. Variant-state arbitration/propagation is not;
passing a variant `type` rejects explicitly. Chrome checks use unchanged upstream
HTML renderers, alongside 219 grouped-playback and 36 target-completion black-box
comparisons on each runtime. Delayed low-level seek stability is a separate VPM
regression check: upstream applies delay again on the next driver tick, whereas
VPM preserves the requested controller time. [Measurements](bench/groups/README.md)
separate control forwarding from complete renderer-target setup and completion.

## Still to build

Color/complex-string mixing is the next bounded unit. Custom effect registration
and the high-level selector `animate` wrapper remain unimplemented.
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

[Renderer-aware adapter measurements](bench/renderer/README.md) cover the complete
create/resolve/seek/stop lifecycle with synchronous and deferred custom classes.
Conformance adds 440 upstream comparisons; Chrome exercises actual percentage,
variable and auto measurement through unchanged upstream renderer/resolver classes.

The group benchmark finds lower forwarding time on Node (14.4% for one member,
52.5% for eight), with Bun overhead of 30.8%/10.9% at 49/108 ns. Complete target
setup, completion and frame draining still cost more: Node 19.40 versus 10.75 μs,
Bun 13.44 versus 10.47 μs. Snapshot validation and stale-write/error guards remain
in place; target setup and deferred custom resolution still need performance work.
