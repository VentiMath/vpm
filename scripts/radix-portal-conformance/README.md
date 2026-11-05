# Portal controls

Pins Portal 1.2.0 and unchanged Dropdown Menu 2.2.1. Comparison builds alias
only Portal and its VPM dependency closure, with the same React and callers.

```sh
npm --prefix scripts/radix-portal-conformance ci --ignore-scripts
npm --prefix scripts/radix-portal-conformance/current ci --ignore-scripts
bun scripts/radix-portal-conformance/build.cjs
node --test packages/vradix-react-portal/test/*.test.cjs
bun test packages/vradix-react-portal/test
node scripts/radix-portal-conformance/archives.cjs
```

Nine groups per runtime compare upstream/VPM in separate server/client processes
with React 19.1.0 and 19.2.4, plus upstream source hashes. Paired assertions
establish fresh-client first-commit placement and explicit-container SSR changes.
Shared cases verify default/explicit/null containers, detached fragments, context,
event bubbling, asChild, attributes, refs, container changes and StrictMode.
Hydration tests preserve sibling DOM identity after a different root has mounted.

Clean npm/Bun fresh and frozen archive installs cover the five-package closure,
CJS/ESM SSR and TypeScript 7 NodeNext/Bundler DOM-only consumers. Chrome runs both
variants with both React versions from those archives. It verifies native focus,
shadow roots, cross-document containers, cleanup, hydration and unchanged Dropdown
Menu's custom-container keyboard/Home/ArrowDown/Escape/focus-return path.

Production benchmark bundles are distinct from development test builds and
source-hash guarded. Each implementation runs in a fresh process; balanced
process order and identical-code controls expose measurement noise.

```sh
bun -e "await require('./scripts/radix-portal-conformance/build.cjs')({production:true})"
OUTPUT=packages/vradix-react-portal/bench/results/node-isolated.json node packages/vradix-react-portal/bench/compare.cjs
OUTPUT=packages/vradix-react-portal/bench/results/bun-isolated.json bun packages/vradix-react-portal/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-portal
```

All recorded samples remain in the reports. These synthetic lifecycle timings do
not establish browser paint, frame-rate or application latency improvements.
