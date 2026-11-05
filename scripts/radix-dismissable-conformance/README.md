# Dismissable Layer controls

Pins Dismissable Layer 1.2.1 and unchanged Dropdown Menu 2.2.1. Only Dismissable
Layer and its VPM closure are aliased; React and callers are shared.

```sh
npm --prefix scripts/radix-dismissable-conformance ci --ignore-scripts
npm --prefix scripts/radix-dismissable-conformance/current ci --ignore-scripts
bun scripts/radix-dismissable-conformance/build.cjs
node --test packages/vradix-react-dismissable-layer/test/*.test.cjs
bun test packages/vradix-react-dismissable-layer/test
node scripts/radix-dismissable-conformance/archives.cjs
```

Nine groups per runtime run separate upstream/VPM server/client processes with
React 19.1.0/19.2.4 and check upstream source hashes. Shared assertions cover the
outside event contract, cancellation, current handlers, portal/branch behavior,
deferred gestures, surface interception, refs, slots, StrictMode and hydration.
Paired controls reproduce stopped-inside tracking, replaced branch nodes,
pointercancel, stale click timers, lower-modal toggles, body style ownership
and cross-document Escape interference. VPM checks logical simultaneous nested
portals, iframe locks/events and replaced modal roots.

Chrome runs these cases from packed archives, adding open shadow branches,
inline style priority, modal/nonmodal Dropdown Menu keyboard/outside behavior
and real CDP mouse/Escape input with CSS pointer hit testing. jsdom does not
preserve pointer-events priority; that assertion runs in Chrome. Four-package
archive installs cover npm/Bun fresh/frozen consumers, Node/Bun CJS/ESM SSR and
TypeScript 7 DOM-only NodeNext/Bundler resolution.

Production benchmark bundles are separate from development test bundles. Four
balanced isolated comparison pairs and two identical-code control pairs retain
every sample. Each case owns its mounted layers, so earlier cases cannot add
listeners to later timings. The immediate-pointer and Escape cases exclude
deferred timer latency; Chrome behavior is checked separately from jsdom timing.

```sh
bun -e "await require('./scripts/radix-dismissable-conformance/build.cjs')({production:true})"
OUTPUT=packages/vradix-react-dismissable-layer/bench/results/node-isolated.json node packages/vradix-react-dismissable-layer/bench/compare.cjs
OUTPUT=packages/vradix-react-dismissable-layer/bench/results/bun-isolated.json bun packages/vradix-react-dismissable-layer/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-dismissable-layer
```
