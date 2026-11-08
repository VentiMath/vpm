# vtanstack-react-table

Independent React 19 adapter targeting **TanStack React Table 9.3.1**, with a
Table 8 entry for the current Material React Table 3.2.1 caller. It uses
`vtanstack-table-core` and `vtanstack-store`; React is a peer. No upstream React
Table or React Store runtime is bundled.

```tsx
import { useTable, tableFeatures, rowSortingFeature,
  createSortedRowModel, sortFn_basic } from 'vtanstack-react-table';

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic },
});
function Results({ problems }) {
  const table = useTable({ features, data: problems,
    columns: [{ accessorKey: 'score', sortFn: 'basic' }],
  }, state => ({ sorting: state.sorting }));
  return <table><tbody>{table.getRowModel().rows.map(row =>
    <tr key={row.id}>{row.getAllCells().map(cell =>
      <td key={cell.id}><table.FlexRender cell={cell} /></td>
    )}</tr>
  )}</tbody></table>;
}
```

`useTable(options, selector?)` subscribes to shallow changes in the selected
state, exposed as `table.state`. Its render views contain a state snapshot;
the underlying table/store and bound components persist. `table.Subscribe`
subscribes to the full state or a supplied atom/store without rerendering the
parent. Standalone `Subscribe` takes an explicit `source`. Source replacement,
selector replacement and unmount detach the previous subscriptions.

`FlexRender` accepts exactly one `cell`, `header` or `footer`. `flexRender`
handles component functions/classes, memo/forward-ref/lazy components, elements
and literal React nodes, including zero. The `flex-render` subpath exports both.
`useLegacyTable` in `legacy` supports the current v9 migration API with v8-style
row-model options. The root `useReactTable` retains the app's v8 state/identity
contract and is an additional compatibility export. Partial controlled pagination
uses the initial page index/size for missing fields, as required by the DataTable
caller’s page-size-only defaults.

Replacing an existing callback preserves its last committed handler when the
replacement render suspends. Unmounted tables do not invoke application
callbacks. Option-driven subscription notices wait until commit,
avoiding React updates during another component's render. These guarantees
concern notifications and callback ownership; they do not make arbitrary
imperative core reads or added/removed callback options during speculative
rendering transactional.

The [core's flat-data scope](../vtanstack-table-core/README.md) applies: nested
source/header trees, interactive resizing and cell selection/spanning are excluded.
`createTableHook` component registries, their scoped context factories, static
function exports and experimental workers are not implemented. No placeholder
exports stand in for these features. The adapter owns the small subscription
bridge it needs instead of introducing a general React Store replacement.

[Conformance](../../scripts/react-table-conformance/README.md) covers current and
app controls, React 19.1/19.2, native Chrome, SSR/hydration, exact npm/Bun archives
and TS7. Unchanged MRT declarations add no errors versus the app control; three
existing MUI date-picker generic errors remain in both with `skipLibCheck:false`.
[Benchmarks](bench/results/README.md) measure complete SSR paths,
not browser frame rate or deployed application latency.

Distributed as [Table 9.3.1](../../docs/INSTALLATION.md#tanstack-table), with
the three-package VPM closure pinned to public URLs. App adoption is separate. The app's two current Table callers are e-commerce
templates on the checked main. Pending app PR #421 moves them to Math Resources
and Contest Season. Its exact column/DataTable functions also pass isolated
Chrome comparisons; this verifies the pending consumer contract, not merge,
deployment or VPM adoption.
