# Motion DOM foundations

The implemented units cover numeric mapping, list staggering, MotionValue,
frame scheduling and numeric tween playback. Controls are unmodified
`motion-dom` 14.7.0 and application 12.36.0,
installed and hashed by the shared [Motion fixture](../motion-utils-conformance/README.md).
The independent runtime was written from public declarations, documented contracts
and public API observations; it contains no copied upstream runtime.

`run.cjs` compares ascending/descending and long ranges, easing, extrapolation,
duplicate boundaries, custom mixers and list delays on Node 24 and Bun 1.4.4.
Package tests separately check snapshots, errors and analytically calculated
outputs. `values.cjs` runs 2,467 comparisons of value state, velocity,
subscriptions, external animation lifecycle, frame ordering and manual clocks.
It also reproduces intentional cancellation/error-recovery differences against
14.7.0. The current-only edges origin has its own comparison. Named stagger
easings come from the verified `vmotion-utils` foundation. Package tests run on Node and Bun, both locally and against installed archives.

`browser.cjs` checks current/app/VPM mappings applied to actual opacity/transform
styles in Chrome, verifies that 20 value changes produce one render, and runs
unchanged current/app `animateMotionValue` producers against VPM values and frame
scheduling. Those animation producers remain fixture code, not shipped runtime.
`types.cjs` compiles strict TS7 ESM/CJS/Bundler consumers and rejects unfinished
APIs. `archives.cjs` packs both
VPM dependencies, verifies isolated npm/Bun installs and frozen reinstalls,
installed declarations and unit tests on both runtimes. The archives are local
verification artifacts, with an explicit local dependency override to prevent
registry resolution. A future public release must pin internal dependency URLs;
no public release or app adoption is claimed.

```sh
npm --prefix scripts/motion-utils-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vmotion-dom/test/*.test.cjs
bun test packages/vmotion-dom/test/*.test.cjs
node scripts/motion-dom-conformance/run.cjs
bun scripts/motion-dom-conformance/run.cjs
node scripts/motion-dom-conformance/values.cjs
bun scripts/motion-dom-conformance/values.cjs
node scripts/motion-dom-conformance/playback.cjs
bun scripts/motion-dom-conformance/playback.cjs
node scripts/motion-dom-conformance/spring.cjs
bun scripts/motion-dom-conformance/spring.cjs
node scripts/motion-dom-conformance/elements.cjs
bun scripts/motion-dom-conformance/elements.cjs
node scripts/motion-dom-conformance/handoff.cjs
bun scripts/motion-dom-conformance/handoff.cjs
node scripts/motion-dom-conformance/renderer.cjs
bun scripts/motion-dom-conformance/renderer.cjs
node scripts/motion-dom-conformance/single.cjs
bun scripts/motion-dom-conformance/single.cjs
node scripts/motion-dom-conformance/reads.cjs
bun scripts/motion-dom-conformance/reads.cjs
node scripts/motion-dom-conformance/transitions.cjs
bun scripts/motion-dom-conformance/transitions.cjs
node scripts/motion-dom-conformance/effects.cjs
bun scripts/motion-dom-conformance/effects.cjs
node scripts/motion-dom-conformance/types.cjs
node scripts/motion-dom-conformance/browser.cjs
node scripts/motion-dom-conformance/archives.cjs
```

See [scope](../../packages/vmotion-dom/README.md) and
[benchmarks](../../packages/vmotion-dom/bench/results/README.md). The Motion DOM
renderer remains pending; these checks do not establish full Motion compatibility.

[Motion value](https://motion.dev/docs/motion-value) and
[frame](https://motion.dev/docs/frame) documentation, public declarations and
black-box API observations define the current contract. The remaining
inertia engine and React renderer are explicitly
outside this unit.

`playback.cjs` runs 25,084 numeric generator/controller comparisons on each runtime.
The current control tolerance is 0.0002 over the tested 0–100 value scale; the
older application's approximate Bezier solver uses 0.06. Separate analytical
linear and quadratic checks avoid deriving expectations only from upstream.
Delay reversal reproduces an upstream discontinuity explicitly. Repeat boundaries,
negative delays, seeking and speed changes are compared with both versions.
Chrome also drives all three implementations with real animation frames and
checks pause/resume and stopped-driver cleanup. Package tests cover reentrant
callbacks, failure cleanup, overflow rejection and MotionValue ownership.

Public [playback documentation](https://motion.dev/docs/animate) and declarations
inform the implementation; the runtime is independently authored. Public Motion
uses seconds, while the low-level Motion DOM generator/controller options tested
here use milliseconds. See the package README for explicit behavior differences.

`spring.cjs` runs 128,741 comparisons per runtime: physical and time-calibrated
spring values, analytic velocity, settling, repeat modes and retargeting. Current
14.7.0 negative-bounce behavior is checked explicitly. Separate analytical tests
check oscillator energy, critical solutions, near-critical continuity, late-time
stability, invalid retargeting and nonsettling controllers. Browser checks use
the calendar's exact scale coefficients and unchanged upstream controllers with
the VPM spring factory. The pause fixture allows upstream's queued pause-time
write before checking stable frames; VPM must still stop immediately.

Public [spring documentation](https://motion.dev/docs/spring), declarations and
API probes define the contracts; no upstream spring runtime was copied. Standalone
visualDuration and settled repeat-gap corrections are explicitly reproduced.

`effects.cjs` compares 1,215 effect snapshots against current/app controls:
CSS units and strings, transform composition, origins, attributes, properties,
SVG drawing, cleanup and current-state release. Chrome checks computed styles,
the actual calendar spring parameters through effect bindings, selectors, SVG
and replacement cleanup. It explicitly reproduces both controls silently skipping
a directly supplied iframe element, while VPM renders it. Array-wrapped iframe
elements work in all three implementations.

The implementation follows public [styleEffect](https://motion.dev/docs/style-effect),
[attrEffect](https://motion.dev/docs/attr-effect),
[propEffect](https://motion.dev/docs/prop-effect) and
[svgEffect](https://motion.dev/docs/svg-effect) contracts and public declarations,
with black-box probes. No upstream effects runtime was copied. Custom effect
registration remains separate work; renderer handoff is now covered below.

`transitions.cjs` runs 40,096 comparisons of numeric `animateMotionValue` defaults,
per-property options, seconds/milliseconds, wildcards, from/velocity, repeats and
callback order. Upstream browser type guards need inert HTMLElement/SVGElement
classes in the Node/Bun fixture; VPM needs neither. Chrome drives calendar scale
and opacity fades through each implementation's own values, adapter and DOM effect.
The pre-existing first-frame rest difference is explicit: a non-repeating VPM
spring stops once both rest thresholds are met, while upstream can resume moving
until its sampled duration expires. Measurements retain this distinction.

Public [animate](https://motion.dev/docs/animate) documentation, exported types and
black-box observations define the independently written adapter. No upstream
runtime was copied. Target/option mutation, explicit unsupported inputs, lifecycle
ownership, cancellation and callback failures have separate package regressions.

`reads.cjs` runs 2,551 comparisons per runtime of base keyframe lifecycles, axis-aligned transforms, CSS/SVG
reads and pixel defaults against the public APIs. The application control lacks
`readStyleValue`/`readSVGValue` and `scaleZ` matrix extraction; those comparisons
use current 14.7.0. Separate analytical regressions cover rotated scale, missing
axes, snapshots, variable cycles, cancellation, failure isolation and conflicting
measurements. Chrome compares real CSS/SVG reads and DOM-resolved keyframes,
checks percentage/auto width against current upstream, then checks explicit
percentage origins, untransformed translation bases, iframe reads and complete
style restoration. Public declarations and black-box observations define the
independently written implementation; no upstream runtime was copied.

`single.cjs` adds 1,872 comparisons per runtime for scalar/MotionValue callers,
seconds-based options, delays, repeats, update samples and completion. Separate
regressions cover validation before replacement, cancelled playback promises,
replay, and throwing start/play/stop/completion callbacks. Chrome runs both public
call forms and paints the MotionValue through each implementation's DOM effect.


`elements.cjs` compares element controllers against current 14.7.0: numeric/unit
keyframes, current DOM origins, variables, delays, repeats and seek snapshots.
Application 12.36.0 has neither animateElement nor animateValues. Chrome also
checks real frame-driven fades/transforms, responsive endpoints, percentage/auto
measurements, delayed seeking, iframe elements and release before resolution.
Package regressions separately check snapshots, shared values, reentrant starts,
failed replacements, pending cancellation/replay and lifecycle errors. Every test
file honors VMOTION_DOM_ENTRY so packed-install runs exercise the installed
runtime, including reads, transitions, single values and the new element APIs.

`handoff.cjs` runs 712 identity, ownership, value and queued-write checks per
runtime against current 14.7.0, for HTML/SVG and existing/empty destinations.
The browser fixture hands VPM values and controllers to unchanged upstream
HTMLVisualElement/SVGVisualElement instances and verifies actual computed output,
including iframe elements and the optional animateElement renderer argument.
Upstream can use native animation here, so assertions compare computed styles,
not only inline declarations. Public declarations and black-box observations
informed this independent bridge; no upstream runtime was copied.
Separate regressions cover preserving velocity and pending work, failed transfer
rollback, source release, stale/reentrant cleanup and reduced/skip motion.

`renderer.cjs` adds 440 current-upstream comparisons per runtime for custom
sync/deferred resolution, wildcards, delays, elapsed time, repeats, easing and
immediate handoff. Chrome uses unchanged upstream HTML renderer/DOM resolver
classes with VPM values for variable, percentage and auto widths, then drives a
custom token resolver on real frames. Separate regressions cover reusable factory
snapshots, frozen output, pending cancellation, callback failures, instance-field
resolvers, lifecycle rejection and failed measurement restoration.

## Group controls and target completion

`groups.cjs` runs 219 public-control comparisons with real numeric controllers;
`targets.cjs` compares 36 multi-property/end-only completions against 14.7.0.
The explicit test driver delivers a tick after upstream complete(), which only
marks completion until delivery. Delay-seek behavior is checked separately: VPM
preserves the requested time rather than applying the delay twice.

The Chrome harness also drives GroupAnimation and animateTarget through unchanged
upstream HTML renderers and checks painted seek, cancel and transitionEnd values.
Regressions cover partial completion, cancelled/stopped/failed/replaced targets,
reentrant callbacks, input snapshots, child failures, empty groups, promise
rejection and timeline-observer disposal. Installed archives run all package tests
and strict TypeScript consumers. Variant propagation and full Framer acceptance
remain outside this bounded target implementation.

```sh
node scripts/motion-dom-conformance/groups.cjs
bun scripts/motion-dom-conformance/groups.cjs
node scripts/motion-dom-conformance/targets.cjs
bun scripts/motion-dom-conformance/targets.cjs
```

## Color and complex mixing

`mixers.cjs` compares 2,538 public samples against 14.7.0 and 12.36.0: hex,
RGB/HSL, alpha, extrapolation, shadows, transforms, filters, nested variables,
component counts and automatic multi-segment interpolation. Separate unit tests
cover CSS percentages/scientific notation, opaque URLs/literals, malformed input,
finite components, container ownership and renderer-driven string animation.
`mixers-browser.mjs` checks computed styles and unchanged HTML renderer targets.
`bench/mixers.cjs` separates color/shadow preparation and sampling and retains a
numeric interpolation control. Every runtime module participates in source hashes.

```sh
node scripts/motion-dom-conformance/mixers.cjs
bun scripts/motion-dom-conformance/mixers.cjs
```

## Neutral keyframes and filters

`neutral.cjs` adds 174 comparisons for public neutral construction and protected
resolver frame state against both controls. Independent tests check omitted
arguments, invalid/nonfinite units, backdrop identities, transparent drop shadows,
scale/matrix identities, preserved URLs, wildcard/zero/none origins and playback.
`neutral-browser.mjs` compares actual CSS midpoints with native Chrome animation and
verifies that omitted shadow color reads current DOM state. Source arrays remain
owned, unsupported neutral functions reject and final `none` is preserved.

```sh
node scripts/motion-dom-conformance/neutral.cjs
node scripts/motion-dom-conformance/selectors.cjs
bun scripts/motion-dom-conformance/neutral.cjs
bun scripts/motion-dom-conformance/selectors.cjs
```

Renderer/mixer before-after suites now use immutable `a518e8ef`. Mixer setup cases
include changing uncached endpoints alongside repeated endpoints; bounded
syntax/result caches never store computed styles. Every new runtime module is
included in the final benchmark source manifest. Older recordings remain in git
history. Resolver regressions include single-item measurement, newly enqueued work,
falsy errors and reentrant completion.

`selectors.cjs` compares 2,688 collection/stagger/per-property samples against the
public `animate()` exports of current Framer Motion 14.7.0 and app 12.36.0 on each
runtime. Numeric outputs allow 1e-12 opacity and 1e-10 transform rounding; function
names and order match exactly. Mock frame timestamps advance between samples,
including the app renderer's once-per-frame write coalescing. Chrome compares
real computed styles against both versions and checks fresh scoped queries,
NodeLists, SVG and iframe elements. Package regressions cover input snapshots,
callback failures, error cleanup, empty groups and reduced-motion preferences.

The wrapper follows public [animate documentation](https://motion.dev/docs/animate)
and public declarations; no upstream runtime was copied. It returns grouped
controls for supported DOM/numeric calls, without claiming current Motion's
editable Timeline API. Default object and single-string calls are checked separately.


`custom-effects.cjs` checks 488 binding, coalescing, explicit flush/release and
animation results against the current 14.7.0 public API. Color comparison parses
equivalent hex/RGBA endpoint spellings; numeric tolerance is 1e-10. The 12.36.0
control lacks registration APIs and is not claimed as a comparison. Independent
regressions cover replacement cleanup, reentrant writes, falsy failures, binding
rollback, computed cycles, scheduler customization, registration precedence,
DOM routing, owned read targets and deferred custom resolvers. Chrome animates a
real DOM output via an object effect and verifies that release stops writes.

```sh
node scripts/motion-dom-conformance/custom-effects.cjs
bun scripts/motion-dom-conformance/custom-effects.cjs
```


`subjects.cjs` adds 1,200 current/app comparisons for single-string and object
playback: colors, units, complex strings, multi-frame offsets, delays, repeats,
reverse/mirror and spring overshoot. Equivalent hex/RGBA spellings are parsed;
string token structure matches and numeric token tolerance is 2e-5 (five-decimal
serialization). Object tests use the frame runtime resolved by each public
Framer Motion entry, advancing its clock between samples. Independent tests cover
numeric-string interpolation, discrete text, rejected cross-unit conversion,
original endpoints, reentrant callbacks, unsafe keys and unreadable origins.
The browser fixture draws through string callbacks and object setters and keeps
iframe nodes on the DOM path. No upstream runtime was read or copied.

```sh
node scripts/motion-dom-conformance/subjects.cjs
bun scripts/motion-dom-conformance/subjects.cjs
```

## Custom-effect completion

`effect-end.cjs` compares direct/custom/default-object completion with current
Motion DOM 14.7.0 and its Framer Motion DOM wrapper. The 12 snapshots include
end-only targets and one, two and eight properties. The app's 12.36.0 does not
export the custom-effect API. `test/effect-end.test.cjs` in the package covers
cancellation, supersession, callback/lifecycle failure, input snapshots and
reentrant writes; Chrome checks custom renderer completion in preRender.

```sh
node scripts/motion-dom-conformance/effect-end.cjs
bun scripts/motion-dom-conformance/effect-end.cjs
```

[Completion benchmarks](../../packages/vmotion-dom/bench/effect-end/README.md)
measure controller construction, completion, queued end writes and release in
separate processes. They are not browser FPS measurements.

Grid stagger delays add 8,127 current14 black-box comparisons for origins, partial rows, easing and signed durations. Dimensions are snapshotted and invalid grids reject; the app12 control does not expose this newer option. Random ordering and sequence timelines remain outside scope.
