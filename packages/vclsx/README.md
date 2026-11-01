# vclsx

Independent, zero-dependency conditional class names, targeting **clsx 2.1.1**.
Supports native ESM, CommonJS, browser bundlers, Node 24+ and Bun.

```js
import clsx from 'vclsx';
clsx('button', active && 'active', ['wide', {disabled: false}]);
// 'button active wide' when active is true
```

The named `clsx` export is the same function. `vclsx/lite` accepts strings only
and ignores other inputs, matching upstream's lite entry. Whitespace, duplicates,
numeric values and falsy filtering retain upstream behavior. No UMD global is
provided.

## Deliberate differences

Dictionary inputs contribute **own enumerable** truthy keys. Inherited properties
are excluded, so prototype properties cannot silently add classes. Applications
relying on inherited class dictionaries must pass explicit own fields instead.

Deep arrays use explicit traversal frames after a bounded fast path. Shared
subarrays are valid; cyclic arrays throw a clear `TypeError`. Inputs are not
modified. Types also accept readonly nested arrays. CJS and ESM share identity;
CommonJS uses Node 24/Bun's synchronous ESM loading.

## Evidence

[Fixtures](../../scripts/clsx-conformance/README.md) retain the upstream tests,
compare generated inputs and render actual React 19/MUI 7 components through
both implementations. Focused controls cover prototype keys, 100,000-level
arrays, cycles, frozen inputs, sparse arrays and module identity. Packed consumer
and TypeScript 7 checks cover the public entries.

[Isolated measurements](bench/results/README.md) retain balanced process pairs,
identical-source controls, raw samples and source hashes. This is a small helper;
CPU timings do not establish a noticeable application speedup.

Two-string calls take 27 vs 33 ns on Node (20% less paired time); mixed nested
inputs take 124 vs 158 ns on Bun (17% less). Other ordinary comparisons are
inconclusive, except Node dictionary filtering: 95 vs 55 ns (69% more). The
64-level array case costs 150% on Node and 84% on Bun because it enters the
explicit-frame path. All costs and control variation remain in the report.

[Provenance](PROVENANCE.json) identifies the source contract and intentional
changes. The [upstream MIT license](LICENSE) is retained; the runtime is newly
implemented.
