# Motion React application contract

The owned `vmotion/react` layer targets the non-test VentiMath callers inspected
at `d0a71aaf`: entrances, inherited hidden/show variants and child staggering,
initial=false, notification controls, and Material polymorphic roots. The fixed
controls are Framer Motion 14.7.0 and app 12.36.0 from the sibling Motion fixture;
React 19.3.1 and esbuild come from the Material System fixture. No upstream runtime
source was copied or imported into the owned package.

- Thirteen Node/Bun tests compare initial SSR for three patterns and three tree
  sizes against both controls, plus escaped content, custom roots, stable factory
  identity, input ownership and explicit unsupported-prop errors.
- Forty-six Chrome scenarios cover entrances, child order and dynamic insertion,
  independent variant scopes, initial=false, stable rerenders/focus, CSS-variable
  bell repeat/reset (including the app's one-second interruption and default
  reset transition), style updates,
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

Custom root replacement, null/restore and callback-ref changes are now checked against both controls. These remain part of the existing app-shaped React contract; no new gesture/layout/primitive scope is claimed.

The initial-render optimization also checks canonical transform ordering, ordinary CSS, array endpoints and the existing null-leading initial-array difference: VPM chooses the first non-null value while the controls omit that initial style.

Sparse keyframe arrays retain their first/last present, non-null endpoints without allocating a filtered array.

The three-package consumer release has a separate check, using the application's
Material 7.2.0 peer fixture and its existing published React Transition Group pin.
Only `motion` needs a dependency URL; both internal dependencies are pinned in
the archive. The checker verifies all public asset bytes and repeats fresh/frozen
npm/Bun installation, SSR, TS7 and browser checks:

```sh
node scripts/pack-motion-release.cjs --ref COMMIT_SHA --tag motion-14.7.0 --out /absolute/empty/directory
node scripts/check-motion-release.cjs /absolute/directory
node scripts/check-motion-release.cjs /absolute/directory --published
```

The November 22 application inventory at `2721de95` has 43 non-test import files;
new public error views and powered-by buttons fit the already tested surface.
This evidence establishes release readiness, not app adoption.
