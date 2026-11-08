# React Table conformance

Controls are React Table 9.3.1, app React Table 8.20.6/core8.20.5 and Material
React Table3.2.1. No upstream runtime is copied into VPM. Public declarations and
black-box behavior supply the contract; installed control hashes are pinned.

`build.cjs` swaps only the React adapter import in the unchanged MRT fixture.
Eight production-mode Chrome DOM snapshots exercise sorting, filtering, paging,
selection, pinning, grouping, data replacement and cleanup. Current API checks
use development React StrictMode: selective state/source subscriptions, source
replacement, controlled state, focused DOM preservation, SSR hydration, render
values and removal of controls. Separate regressions distinguish committed
callbacks and quiet disposal from the upstream control's behavior. Source atoms
share the reactive implementation of their table; this is not a generic bridge
between incompatible signal engines.

`caller-regressions.mjs` adds 37 synthetic resource/contest snapshots: page-size-only
initial pagination, fresh MRT column/callback objects, missing values last in both
sort directions, custom sorting with grouped rows, custom multi-select filtering,
actual select-menu clicks, combined filters/facets, paging, selection and pinning.
These run from both source and exact archives in the regular Chrome gate. They
encode the contract without including private application source. A separate local
check extracted the exact factory/DataTable functions at pending app PR #421 head
`77b3abac`; all 37 snapshots matched after the fixes. Routes are `/apps/math-resources`
and `/apps/contest-season`; that check did not establish merge or adoption.

`ssr.cjs` compares current, legacy and app Table8 markup on Node24 and Bun.
`types.cjs` checks selected-state inference and the unchanged MRT declarations.
With strict library checking, both upstream8 and VPM have exactly the same three
MUI8 DatePicker/DateTimePicker/TimePicker generic-arity diagnostics. They are
compared explicitly, not hidden with skipLibCheck or counted as VPM errors.

`archives.cjs` verifies exact bytes, clean and frozen npm/Bun installs, CJS/ESM,
React19.1/19.2, strict public consumers and native browser behavior from packed
files. Advanced component registry factories and worker/static plugin APIs are
outside scope, as are the core's unsupported data/header/resizing features.
No authenticated app data, new app feature, release or deployment is implied.

```sh
npm --prefix scripts/react-table-conformance ci --ignore-scripts
bun scripts/react-table-conformance/build.cjs
node scripts/react-table-conformance/ssr.cjs
node scripts/react-table-conformance/types.cjs
node scripts/react-table-conformance/browser.cjs
node scripts/react-table-conformance/archives.cjs
```
