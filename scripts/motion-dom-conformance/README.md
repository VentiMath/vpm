# Motion DOM foundations

The implemented units cover numeric mapping, list staggering, MotionValue and
frame scheduling. Controls are unmodified `motion-dom` 14.7.0 and application 12.36.0,
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
easings come from the verified `vmotion-utils` foundation. All 36 package tests
run on Node and Bun, both locally and against installed archives.

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
node scripts/motion-dom-conformance/types.cjs
node scripts/motion-dom-conformance/browser.cjs
node scripts/motion-dom-conformance/archives.cjs
```

See [scope](../../packages/vmotion-dom/README.md) and
[benchmarks](../../packages/vmotion-dom/bench/results/README.md). The Motion DOM
renderer remains pending; these checks do not establish full Motion compatibility.

[Motion value](https://motion.dev/docs/motion-value) and
[frame](https://motion.dev/docs/frame) documentation, public declarations and
black-box API observations define the current contract. The remaining playback
engine, effects and React renderer are explicitly outside this unit.
