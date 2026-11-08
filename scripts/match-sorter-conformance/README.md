# Match-sorter conformance

Pinned controls: @tanstack/match-sorter-utils 9.2.6 and the app's 8.19.4.
`build.cjs` verifies their installed-source hashes and compiles the unchanged
Material React Table 3.2.1 `filterFns.ts` archive. The public caller source and
MIT license are retained under `upstream`; no upstream runtime is shipped in
the VPM package. Private app callsite identity is recorded by hash only.

`run.cjs` compares 13,232 scalar/accessor rank results, including 6,000 seeded
accessor cases per control, plus comparator results. Focused assertions cover
canonical accents, stacked marks, uppercase Ł, frozen options, fractional scores
and preserved unrelated scripts. `caller.cjs` compares 72 real MRT fuzzy-filter
results with metadata and auto-remove behavior; three deliberate normalization
corrections are separately asserted through the same caller.

`archives.cjs` packs the exact package and verifies fresh/frozen npm and Bun
installs under the upstream import name. Installed files match package bytes;
Node/Bun, CJS/ESM, TS 7 NodeNext/Bundler and the unchanged caller all pass. No
remove-accents package or internal override is needed in this standalone install.
These are package/caller contracts, not a full authenticated table UI test.

```sh
npm --prefix scripts/match-sorter-conformance ci --ignore-scripts
bun scripts/match-sorter-conformance/build.cjs
node scripts/match-sorter-conformance/archives.cjs
node packages/vtanstack-match-sorter-utils/bench/compare.cjs
bun packages/vtanstack-match-sorter-utils/bench/compare.cjs
```
