# React Hook Form caller checks

Controls: current react-hook-form 7.92.0 and VentiMath's 7.56.0, React 19.3.1,
Zod 3.24.3 and the unchanged @hookform/resolvers 5.0.1 Zod bridge. The package
was independently written from the public API and actual caller inventory.

`scenario.cjs` runs 46 state/DOM snapshots for controlled nested inputs,
conditional steps, selective validation, async submission, resets, manual errors
and native registrations across all five modes. Separate processes avoid React
module/version contamination. The same scenario runs in Chrome. Store tests
cover stale promises, reset ownership, unsafe paths, snapshot isolation, disabled
submission, focus, ref handoff and dispatch teardown. StrictMode is exercised. VPM-specific checks cover reactive values/errors, disabled fields, conditional unregister and unchanged-field render/focus preservation.

```sh
npm --prefix scripts/hook-form-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vreact-hook-form/test/store.test.cjs
bun test packages/vreact-hook-form/test/store.test.cjs
node scripts/hook-form-conformance/run.cjs
bun scripts/hook-form-conformance/run.cjs
node scripts/hook-form-conformance/types.cjs
node scripts/hook-form-conformance/browser.cjs
node scripts/hook-form-conformance/archives.cjs
```

The archive check performs fresh and frozen npm/Bun installs, verifies actual
ESM/CJS exports and SSR with the installed React peer, compiles installed types
with the existing Zod resolver, and reruns store, React and Chrome checks on the
packed implementation. Controlled React scenarios use a single React fixture
instance for both implementations. No app deployment or full UI adoption is
claimed. [Scope](../../packages/vreact-hook-form/README.md) and
[benchmarks](../../packages/vreact-hook-form/bench/results/README.md) remain
explicit about unsupported APIs and subscription performance.
