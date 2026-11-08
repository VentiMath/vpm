import * as React from "react";
import {
  useTable,
  useReactTable,
  Subscribe,
  tableFeatures,
  rowSortingFeature,
  createSortedRowModel,
  sortFn_basic,
  createColumnHelper,
  flexRender,
  TableState,
} from "vtanstack-react-table";
import { useLegacyTable } from "vtanstack-react-table/legacy";
import { FlexRender } from "vtanstack-react-table/flex-render";
import type { MRT_ColumnDef, MRT_TableOptions } from "material-react-table";
interface Problem {
  id: string;
  topic: string;
  score: number;
}
const data: Problem[] = [{ id: "a", topic: "Algebra", score: 5 }];
const h = createColumnHelper<Problem>();
const columns = [
  h.accessor("score", { cell: ({ getValue }) => getValue().toFixed(1) }),
];
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic },
});
function View() {
  const t = useTable({ features, data, columns }, (s) => ({
    sorting: s.sorting,
  }));
  const selected: TableState["sorting"] = t.state.sorting;
  // @ts-expect-error unselected slice is not present on selected state
  t.state.pagination;
  const row = t.getRowModel().rows[0];
  const original: Problem = row.original;
  const legacy = useReactTable({ data, columns });
  const newer = useLegacyTable({ data, columns });
  const callback = ({ sorting }: Pick<TableState, "sorting">) =>
    React.createElement("span", null, sorting.length);
  const child = (
    <t.Subscribe selector={(s) => ({ sorting: s.sorting })}>
      {callback}
    </t.Subscribe>
  );
  const fullState = <t.Subscribe>{state => <span>{state.sorting.length}</span>}</t.Subscribe>;
  void fullState;
  const cell = <FlexRender cell={row.getAllCells()[0]} />;
  void [selected, original, legacy, newer, cell];
  return child;
}
const defs: MRT_ColumnDef<Problem>[] = [
  { accessorKey: "topic", header: "Topic" },
  {
    accessorKey: "score",
    header: "Score",
    Cell: ({ row }) => row.original.score.toFixed(0),
  },
];
const options: MRT_TableOptions<Problem> = {
  columns: defs,
  data,
  enableGrouping: true,
  enableRowSelection: true,
};
void [options, View, Subscribe, flexRender];
// @ts-expect-error input rows retain their type
useReactTable({ data, columns, getRowId: (r) => r.missing });
