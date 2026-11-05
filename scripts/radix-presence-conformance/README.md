# Presence controls

Pins Presence 1.1.11 and unchanged Dropdown Menu 2.2.1. Each comparison aliases
only Presence and its VPM dependency; upstream and VPM share React and callers.

```sh
npm --prefix scripts/radix-presence-conformance ci --ignore-scripts
npm --prefix scripts/radix-presence-conformance/current ci --ignore-scripts
bun scripts/radix-presence-conformance/build.cjs
node --test packages/vradix-react-presence/test/*.test.cjs
bun test packages/vradix-react-presence/test
node scripts/radix-presence-conformance/archives.cjs
```

Nine groups per runtime run upstream/VPM client/server checks in separate
processes for React 19.1.0 and 19.2.4, plus pinned source hashes. Synthetic
controls compare the exact-name, multiple-animation, pseudo-element and ref
replacement differences. VPM checks native promise identities, stale completion,
CSS name decoding, forceMount and nonblocking animations. CSSOM's live computed
style declaration is modeled explicitly because jsdom returns snapshots.

Archive checks install the exact two-package closure with npm and Bun, fresh
and frozen. Node/Bun CJS/ESM SSR and TypeScript 7 NodeNext/Bundler DOM-only
consumers run on both React versions. Chrome verifies the installed archives:
real animations, multiple exits, pseudo-elements, reopening, replaced children,
iframes, StrictMode and unchanged Dropdown Menu exit/focus behavior. VPM also
checks native cancellation, exit-animation replacement, forced mounts and
zero/infinite/missing animations.
Focus emulation keeps the headless page active for native Radix focus handlers.

Benchmark bundles are separately built in production mode, source-hash guarded,
and timed in isolated balanced processes with identical-code controls:

```sh
bun -e "await require('./scripts/radix-presence-conformance/build.cjs')({production:true})"
OUTPUT=packages/vradix-react-presence/bench/results/node-isolated.json node packages/vradix-react-presence/bench/compare.cjs
OUTPUT=packages/vradix-react-presence/bench/results/bun-isolated.json bun packages/vradix-react-presence/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-presence
```

All process samples remain in the reports. Measurements cover React/jsdom
lifecycle cost, not real browser animations or end-to-end application latency.
