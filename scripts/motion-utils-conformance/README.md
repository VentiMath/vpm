# Motion utility conformance

The independent runtime targets `motion-utils` **14.7.0**, with **12.36.0** as the
installed application control. The actual caller revision and paths are recorded
in [package provenance](../../packages/vmotion-utils/PROVENANCE.json). Controls
are installed unmodified; their full distributions and lockfile have
[SHA-256 pins](provenance.json). No private app source is committed.

- `run.mjs`: 27,584 checks across current/app controls: all exports, scalar ranges,
  predicates, array moves, step boundaries and named/custom curve grids. Scalar
  results compare exactly; normalized curves use 0.000002 current tolerance and
  separately disclosed older-version tolerances (0.0012 named / 0.005 custom).
- Package tests state independent expectations for subscription mutation,
  stale disposers, nested notification, exception propagation, memoized undefined,
  invalid configuration and analytical curve solutions.
- `diagnostics.cjs`: development/production warning behavior and the deliberate
  undefined-memo change, with fresh processes for each mode/control.
- `build-browser.cjs` substitutes only the utility package beneath unchanged
  current/app Motion DOM and Framer Motion callers. React/React DOM are 19.3.1.
- `callers.cjs`: value notifications, sampled animations, interpolation and
  staggering on Node/Bun. A self-unsubscribe regression fails with both upstream
  utility versions and passes with VPM inside both unchanged MotionValue callers.
- `browser.cjs`: real Chrome fades shaped like the contest grids, live opacity
  and transform subscriptions, DOM identity, and teardown, with four combinations
  (current/app callers × upstream/VPM utilities). No live account or app writes.
- `types.cjs`: strict TS7 ESM/CJS NodeNext and Bundler consumers with negative
  checks for wrong subscriber arguments and APIs outside this leaf.
- `archives.cjs`: exact tarball through isolated npm/Bun installs and frozen
  reinstalls, installed types, both runtime unit suites and singleton identity.

The upstream [easing documentation](https://motion.dev/docs/easing-functions),
public declarations and public API observations define the compatibility target.
Numeric control points are API data; no upstream runtime source is shipped.

```sh
npm --prefix scripts/motion-utils-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/motion-utils-conformance/check-controls.cjs
node --test packages/vmotion-utils/test/index.test.cjs
bun test packages/vmotion-utils/test/index.test.cjs
node scripts/motion-utils-conformance/run.mjs
bun scripts/motion-utils-conformance/run.mjs
node scripts/motion-utils-conformance/diagnostics.cjs
bun scripts/motion-utils-conformance/diagnostics.cjs
bun scripts/motion-utils-conformance/build-browser.cjs
node scripts/motion-utils-conformance/callers.cjs
bun scripts/motion-utils-conformance/callers.cjs
node scripts/motion-utils-conformance/browser.cjs
node scripts/motion-utils-conformance/types.cjs
node scripts/motion-utils-conformance/archives.cjs
```

[Measurements](../../packages/vmotion-utils/bench/results/README.md) compare
current 14.7.0 against VPM on Node 24 and Bun 1.4.4, with one timed implementation
per fresh process, balanced AB/BA order and identical-source controls. Pure
utility timings do not establish browser frame-rate or application latency gains.

The Bun performance follow-up keeps all correctness gates and adds reflected
analytic curves, strict control-type validation, fresh function identities and
single-listener recursive lifecycle tests. [Previous-code measurements](../../packages/vmotion-utils/bench/previous/README.md)
reconstruct commit `453b9dfd` with `baseline.cjs`; run the same benchmark with
`VMOTION_BENCH_PREVIOUS=1` to compare the optimization directly.
