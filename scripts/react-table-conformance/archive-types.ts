import * as React from "react";
import {
  useTable,
  useReactTable,
  tableFeatures,
  rowSortingFeature,
  createSortedRowModel,
  sortFn_basic,
  createColumnHelper,
  Subscribe,
  FlexRender,
} from "@tanstack/react-table";
import { useLegacyTable } from "@tanstack/react-table/legacy";
import { flexRender } from "@tanstack/react-table/flex-render";
const columns = [
  createColumnHelper<{ score: number }>().accessor("score", {
    cell: ({ getValue }) => getValue().toFixed(2),
  }),
];
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic },
});
function View() {
  const t = useTable({ features, data: [{ score: 1 }], columns }, (s) => ({
    sorting: s.sorting,
  }));
  const n: number = t.getRowModel().rows[0].original.score;
  // @ts-expect-error selected state excludes pagination
  t.state.pagination;
  // @ts-expect-error wrong row field
  useReactTable({ data: [{ score: 1 }], columns, getRowId: (r) => r.missing });
  const old = useLegacyTable({ data: [{ score: 1 }], columns });
  void [old, n];
  return React.createElement("p", null, t.state.sorting.length);
}
void [View, Subscribe, FlexRender, flexRender];
