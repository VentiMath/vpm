# Themeable conformance

Controls pin react-themeable **1.1.0**, react-autosuggest **10.1.0** and React **19.1.0**.
The first two match current upstream and VentiMath pins. The nine-test upstream
file at commit `0f15ce521684303b00e749148c5947a03093c522` is retained unchanged with
SHA-256 hashes. The upstream manifest/README declares MIT; the fixture includes
the MIT notice for author Mark Dalgleish because the source tree has no separate
license file. The adapter supplies only its imports and synchronous test hooks.

```sh
npm --prefix scripts/themeable-conformance ci --ignore-scripts --no-audit --no-fund
node scripts/themeable-conformance/run.cjs
bun scripts/themeable-conformance/run.cjs
node --test packages/vreact-themeable/test/contracts.test.cjs
bun test packages/vreact-themeable/test/contracts.test.cjs
node scripts/themeable-conformance/archives.cjs
```

`run.cjs` compares 6,000 generated class/style/decorated-theme calls, including
empty selections, duplicates, inherited entries and mixed values. Package tests
cover exact keys, live map changes, getter ordering, symbols, source descriptors,
shallow identity, prototype-key handling and decorator arguments/receiver.

`load.cjs` resolves only react-themeable to VPM inside the unchanged public
Autowhatever component. `callers.cjs` compares 24 root-key/prop/HTML snapshots.
`browser.cjs` compares nine mounted class/style/decorator states in isolated Chrome,
including computed styles and preserved input identity/focus after rerenders.
A separate local check passed both actual FuseSearch theme objects through 12
synthetic caller states; the private application source is not copied here.
These are caller contracts, not full authenticated VentiMath UI verification.

`archives.cjs` checks exact packed bytes, fresh/frozen npm/Bun installs, Node/Bun
contracts/callers, CJS/ESM identity, TS7 NodeNext/Bundler without ambient platform
types, and the mounted Chrome fixture against the npm-installed archive.
[Package documentation](../../packages/vreact-themeable/README.md) distinguishes
the intentional prototype/factory-validation changes; [benchmarks](../../packages/vreact-themeable/bench/results/README.md)
retain isolated processes and identical-source controls.
