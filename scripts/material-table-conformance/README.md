# Material React Table conformance

This gate compares the independent widget with Material React Table 3.2.1,
React Table 8.20.6 and Table core 8.20.5. The control and React 19.1/MUI 7.2/Emotion
11.14 peers come from the existing locked
[React Table fixture](../react-table-conformance/README.md). `build.cjs` verifies
its control hashes before building either implementation. The VPM side uses its
six-package Table/ranking/highlighting closure; the upstream widget is only a
comparison fixture. No private app source is committed.

The production Chrome bundle runs all 37 synthetic resource/contest caller
snapshots from `caller-regressions.mjs` unchanged. Raw output is retained in the
fixture’s ignored `.vpm-material-table/browser-results.json`. Comparison omits
rendered text because the widget has its own markup and labels, and normalizes
empty-array filter entries: VPM removes them, upstream may restore them. It does
not normalize row IDs, ordering, selected rows, filters with values, facets,
grouping, pagination or column state.

`interactions.mjs` additionally clicks the actual pagination, page-selection,
row-action, sort, filter, visibility, density and grouping controls. A custom
toolbar uses the same exported pieces as VentiMath. Parent rerenders preserve
focused DOM. Optional `VPM_MATERIAL_SCREENSHOTS=/absolute/path` captures light and
dark views and checks that their computed backgrounds change. These are Chrome
acceptance checks, not a screen-reader or cross-browser certification.

`ssr.cjs` compares sorted pagination, escaping, empty data and custom toolbars on
Node 24 and Bun. Package unit tests cover hook-using custom cells, partial initial
pagination, disabled pagination, filter metadata and explicit scope rejection.
`types.cjs` checks the caller-shaped wrapper under strict TypeScript 7 NodeNext
and bundler resolution. It does not compile upstream MRT’s entire declaration
surface as though it were implemented. Public MUI type imports explicitly select
the CJS declarations used by the runtime, avoiding MUI 7.2’s unresolved ESM
transition-type subpath under NodeNext.

`archives.cjs` packs the six packages, verifies bytes and workspace dependency
versions, then tests clean and frozen npm/Bun installs on React 19.1 and 19.2.
Every install checks CJS/ESM identity, Node/Bun SSR and strict consumers; both npm
installs also run the full Chrome matrix. Icons and date pickers are installed
only as peers for the upstream control: the VPM widget does not import them.

```sh
npm --prefix scripts/react-table-conformance ci --ignore-scripts
bun scripts/material-table-conformance/build.cjs
node scripts/material-table-conformance/ssr.cjs
node scripts/material-table-conformance/types.cjs
node scripts/material-table-conformance/browser.cjs
node scripts/material-table-conformance/archives.cjs
node --test packages/vmaterial-react-table/test/index.test.cjs
bun test packages/vmaterial-react-table/test/index.test.cjs
```

The [benchmark report](../../packages/vmaterial-react-table/bench/results/README.md)
records production-mode whole-widget SSR with shared peers and separate process
heaps. Output checks run outside timing. Balanced order and independently
repeated identical-source controls accompany every case; browser interaction and
application load time are not inferred from SSR.
