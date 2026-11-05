# Focus Scope controls

Pins Focus Scope 1.3.1 and unchanged Dropdown Menu 2.2.1. Only Focus Scope and
its VPM dependency closure are aliased; React and callers are shared.

```sh
npm --prefix scripts/radix-focus-scope-conformance ci --ignore-scripts
npm --prefix scripts/radix-focus-scope-conformance/current ci --ignore-scripts
bun scripts/radix-focus-scope-conformance/build.cjs
node --test packages/vradix-react-focus-scope/test/*.test.cjs
bun test packages/vradix-react-focus-scope/test
node scripts/radix-focus-scope-conformance/archives.cjs
```

Nine groups per runtime run separate upstream/VPM server/client processes with
React 19.1.0/19.2.4 and verify pinned source hashes. Cases cover autofocus,
trap/loop boundaries, cancellation, fresh callbacks, nested scopes, branches,
ref cleanup, StrictMode and hydration. jsdom uses explicit visible layout boxes;
Chrome verifies actual focus eligibility and native keyboard behavior.

Clean five-package archive installs cover npm/Bun fresh/frozen consumers,
Node/Bun CJS/ESM SSR and TypeScript 7 DOM-only NodeNext/Bundler resolution.
Chrome runs upstream/VPM on both React versions from these archives. Paired
controls reproduce consumer-key-handler loss, wrong positive/inert Tab edges,
deferred focus stealing, inactive mutation recovery, iframe traps and global
stack interference. Shared modal/nonmodal Dropdown Menu cases exercise opening,
Home/ArrowDown/Escape and focus return. Real Tab/Shift+Tab uses CDP keyboard input.
VPM checks logical nested portals, active removal, open shadows and StrictMode.

Benchmarks use separate production bundles and one DOM per isolated worker.
Visible-style, layout-box and checkVisibility models are identical for both
implementations; the measurements exclude CSS/layout costs. Four balanced
comparison pairs and two identical-code control pairs retain every sample.

```sh
bun -e "await require('./scripts/radix-focus-scope-conformance/build.cjs')({production:true})"
OUTPUT=packages/vradix-react-focus-scope/bench/results/node-isolated.json node packages/vradix-react-focus-scope/bench/compare.cjs
OUTPUT=packages/vradix-react-focus-scope/bench/results/bun-isolated.json bun packages/vradix-react-focus-scope/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vradix-react-focus-scope
```
