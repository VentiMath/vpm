# Table conformance

Pinned controls: Table core 9.3.1, application core 8.20.5, React Table 8.20.6,
Material React Table 3.2.1, React 19.1.0 and the application's MUI versions.
`provenance.json` hashes their installed runtime files. None is shipped by VPM.

- `run.cjs`: fixed application pipeline, cache identity, hostile IDs and grouped selection.
- `matrix.cjs`: 1,152 seeded state transitions against Table 8 and 9, comparing
  rows, values, depth, cell flags, selection and pagination.
- `state.cjs`: owned/controlled state, creation-time external-atom ownership,
  automatic page reset and manual pagination. Dynamic `atoms` option replacement
  is ignored by the current control and VPM; new atoms belong in a new instance.
- `functions.cjs`: 2,646 comparator checks across numbers, natural names, missing
  values, booleans and dates. Comparator sign, not magnitude, is the contract.
- `build.cjs` and `browser.cjs`: unchanged MRT and React Table adapter with only
  the core import changed. Eight Chrome transitions compare table DOM, sort,
  page, filter, checkbox selection, pin/hide, group/expand and replacement.
  This uses synthetic rows and the application DataTable options, not signed-in
  application data. No claim is made about a future Table 9 React adapter.
- `archives.cjs`: exact package contents, fresh and frozen npm/Bun installs,
  Node/Bun conformance, CJS/ESM and TS7 consumers; browser rerun from packed bytes.

The declared application contract is flat source rows/columns. Nested headers,
nested source trees, interactive resizing, cell selection/spanning and custom
feature plugins are excluded. Framework typings and a consumer release are a
separate adapter task; a runtime browser comparison does not certify all MRT
public TypeScript declarations against these independently scoped declarations.

```sh
npm --prefix scripts/table-conformance ci --ignore-scripts
node scripts/table-conformance/run.cjs
node scripts/table-conformance/matrix.cjs
bun scripts/table-conformance/build.cjs
node scripts/table-conformance/browser.cjs
node scripts/table-conformance/archives.cjs
```
