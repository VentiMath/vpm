# Radix Slot conformance

Pins **@radix-ui/react-slot 1.5.0**, checked November 2, 2026, and the app's
**1.2.3** baseline. React 19.2.4, Radix Primitive 2.1.3, Testing Library, jsdom and
React declarations are test-only. The lockfile records exact reference archives;
[provenance](../../packages/vradix-react-slot/PROVENANCE.json) records source hashes.

`run.cjs` checks prop precedence, styles, class names, handler order/return/errors,
64 generated prop combinations, marker content, factories, empty children and
fragments. Current-version cases add invalid-child validation, render functions,
ARIA deduplication, lazy wrappers and absence of spurious key warnings from
render-function children. Paired controls demonstrate that multiple
targets silently select the last upstream target and that a cyclic lazy wrapper
does not terminate (in a child process with a two-second timeout after an entry marker). VPM rejects
both explicitly. The older baseline's private marker symbol is recorded as a
version difference, not accepted as current cross-copy interoperability.

`callers.cjs` substitutes only the Slot import in an unchanged Radix Primitive
2.1.3 module. Original and VPM run the same mounted `asChild` checks with shared
React identity: StrictMode, stable and replaced refs, child-first clicks,
fragment refs, render-function contents, lazy components and hydration.

`archives.cjs` packs Slot and its VPM ref dependency and installs the exact closure
through npm and Bun. The Bun fixture explicitly overrides the unpublished ref
dependency to its exact local archive; a release must pin the public archive URL
when published. Both runtimes check CJS/ESM identity and SSR; TypeScript 7
checks generic typed slots, required props, ref types and render-function types
under NodeNext and Bundler resolution, without Node ambient types. Browser
bundling must not require Node built-ins. No application dependency is modified.

```sh
npm --prefix scripts/slot-conformance ci --ignore-scripts --no-audit --no-fund
node --test packages/vradix-react-slot/test/slot.test.cjs
bun test packages/vradix-react-slot/test/slot.test.cjs
node scripts/slot-conformance/archives.cjs
```

[Benchmarks](../../packages/vradix-react-slot/bench/results/README.md) use balanced,
isolated process pairs and identical-code controls. They compare the combined
Slot/ref stack in React's development SSR build; no browser rendering improvement is implied.
