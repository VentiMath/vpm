# Motion React application contract

The owned `vmotion/react` layer targets the non-test VentiMath callers inspected
at `3aa9eb28`: entrances, inherited hidden/show variants and child staggering,
initial=false, notification controls, and Material polymorphic roots. The fixed
controls are Framer Motion 14.7.0 and app 12.36.0 from the sibling Motion fixture;
React 19.3.1 and esbuild come from the Material System fixture. No upstream runtime
source was copied or imported into the owned package.

- Eleven Node/Bun tests compare initial SSR for three patterns and three tree
  sizes against both controls, plus escaped content, custom roots, stable factory
  identity, input ownership and explicit unsupported-prop errors.
- Forty Chrome scenarios cover entrances, child order and dynamic insertion,
  independent variant scopes, initial=false, stable rerenders/focus, CSS-variable
  bell repeat/reset, style updates,
  Strict Mode, active-unmount cleanup, reduced motion and retained-node hydration.
  VPM additionally checks controls.set and a live reduced-motion policy change. The set check is an owned regression, not an upstream equivalence claim. Production and
  development builds run separately. Endpoint/ordering/ownership checks do not
  establish pixel-identical spring trajectories or full app acceptance.
- Strict TypeScript 7 NodeNext/Bundler consumers exercise refs, native/custom
  roots, variants, controls and Material composition, including negative props.
- Packed archives are pinned throughout the 21-package Motion+Material fixture
  closure. Fresh and frozen npm/Bun installs verify entry identity, exact bytes,
  direct SSR on Node/Bun, declarations and the installed browser candidate.
  Motion itself has only two transitive VPM runtime packages; Material is a caller
  fixture, not a Motion dependency.

```sh
npm --prefix scripts/motion-utils-conformance ci --ignore-scripts
npm --prefix scripts/mui-system-conformance ci --ignore-scripts --legacy-peer-deps
node scripts/motion-react-conformance/build.cjs
node --test packages/vmotion/test/react.test.cjs
bun test packages/vmotion/test/react.test.cjs
node scripts/motion-react-conformance/types.cjs
node scripts/motion-react-conformance/browser.cjs
VPM_REACT_MODE=development node scripts/motion-react-conformance/browser.cjs
node scripts/motion-react-conformance/archives.cjs
```

[SSR benchmarks](../../packages/vmotion/bench/results/README.md) use fresh
production processes, balanced AB/BA pairs and identical-source controls. The
12-element trees are prepared before timing; SSR hook/context allocation and
initial style generation are timed. All raw samples and source/bundle hashes are
retained. This measures server rendering, not animation setup after mount,
interaction latency, browser paint, or app startup.
