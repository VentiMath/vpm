export {
  useLegacyTable,
  legacyCreateColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
} from "./index.cjs";
export type { LegacyTableOptions, LegacyReactTable } from "./index.cjs";
export type {
  RowModelFactory,
  ColumnDef as LegacyColumnDef,
  Column as LegacyColumn,
  Cell as LegacyCell,
  Header as LegacyHeader,
  Row as LegacyRow,
  Table as LegacyTable,
} from "vtanstack-table-core";
