# Section iterator conformance

Controls pin section-iterator **2.0.0** and react-autosuggest **10.1.0**, the current
releases and VentiMath pins, with React 19.1. The upstream MIT test file at commit
`7f4a37aa714535d0ef4e5888b0a21e42db934573` is retained byte-identically with its
license and SHA-256 hash. The adapter supplies its two imports and synchronous
suite hooks; all 21 test bodies run unchanged against both implementations.

```sh
npm --prefix scripts/section-iterator-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/section-iterator-conformance/run.cjs
bun scripts/section-iterator-conformance/run.cjs
node --test packages/vsection-iterator/test/contracts.test.cjs
bun test packages/vsection-iterator/test/contracts.test.cjs
node scripts/section-iterator-conformance/archives.cjs
```

`run.cjs` compares 435,099 method calls over every valid position in 100 flat and
2,000 seeded grouped lists. Original package tests add detached snapshots, frozen
inputs, huge safe counts, returned-array ownership and invalid-input checks.
`load.cjs` executes the unmodified public Autowhatever component from
react-autosuggest, resolving only section-iterator to VPM for the replacement
control. Its 301 callbacks include both arrows, unrelated keys, empty groups and
replacement of the item list. No upstream or application runtime is copied into
VPM’s package.

`build.cjs` bundles the actual component twice with React 19.1, once per iterator.
`browser.cjs` uses isolated Chrome and 260 trusted key events to compare mounted
input behavior, section boundaries, empty lists and sentinel wraparound. Native
layout and the full application's accessibility/form behavior are outside this
pure index-helper contract. No authenticated app or live data is touched.

`archives.cjs` installs the exact tarball through npm and Bun with fresh/frozen
locks, checks archive bytes and file contents, executes the Node/Bun tests and
caller controls, checks CJS/ESM identity and TS7 NodeNext/Bundler with no ambient
platform declarations, and repeats the mounted Chrome control against the npm
archive. [Package behavior](../../packages/vsection-iterator/README.md) lists
intentional validation/snapshot differences; [benchmarks](../../packages/vsection-iterator/bench/results/README.md)
keep comparison and identical-source controls in separate processes.
