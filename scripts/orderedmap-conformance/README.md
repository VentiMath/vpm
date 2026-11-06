# OrderedMap compatibility and caller checks

The development-only fixtures pin orderedmap **2.1.1** and ProseMirror model
**1.25.12**, with **1.25.4** retained for VentiMath's installed caller. Upstream
code is used as a comparison fixture, not shipped inside `vorderedmap`.

```sh
npm --prefix scripts/orderedmap-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vorderedmap/test/*.test.cjs
bun test packages/vorderedmap/test/
node scripts/orderedmap-conformance/callers.cjs
bun scripts/orderedmap-conformance/callers.cjs
node scripts/orderedmap-conformance/archives.cjs
```

Six contract groups include 4,000 deterministic edit steps against upstream,
collision/order cases, immutable history, cached lookups, prototype-named keys,
empty-string renames and no-op updates. Corrections are asserted explicitly;
the upstream control reproduces inherited-key import and `__proto__` loss.
These are original public-contract tests, not upstream's own test suite.

`model.cjs` executes unchanged, pinned CommonJS ProseMirror source with just the
`orderedmap` dependency supplied by the test. Both caller versions run with the
original and replacement. Eight instrumented VPM factory calls cover schema
construction, extension order, default nodes, mark precedence, immutable schema
edits and document JSON round-trips. No global module resolver is patched.

`archives.cjs` checks the exact package bytes, fresh/frozen npm/Bun installs,
Node/Bun contracts and callers, CJS/ESM identity, TypeScript 7 CJS/ESM under both
NodeNext/Bundler without Node or DOM declarations, and execution of a browser
bundle. It does not claim application deployment or Tiptap UI acceptance.

[Measurements](../../packages/vorderedmap/bench/results/README.md) use the shared
isolated-process harness, balanced execution order and identical-source controls.
All pairs are retained. Reproduce the source-hashed runs from the repository:

```sh
OUTPUT=packages/vorderedmap/bench/results/node-isolated.json node packages/vorderedmap/bench/compare.cjs
OUTPUT=packages/vorderedmap/bench/results/bun-isolated.json bun packages/vorderedmap/bench/compare.cjs
node scripts/render-bench-report.cjs packages/vorderedmap
```
