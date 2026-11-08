import * as React from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MaterialReactTableProps,
  type MRT_TableInstance,
  MRT_GlobalFilterTextField,
  MRT_ToolbarDropZone,
  MRT_TablePagination,
  MRT_ToolbarAlertBanner,
} from "vmaterial-react-table";
type RecordRow = { id: string; name: string; score?: number; levels: string[] };
const columns: MRT_ColumnDef<RecordRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    Cell: ({ row }) => <b>{row.original.name}</b>,
  },
  {
    accessorKey: "score",
    header: "Score",
    sortUndefined: "last",
    sortingFn: (a, b) => (a.original.score ?? 0) - (b.original.score ?? 0),
  },
  {
    id: "levels",
    header: "Levels",
    accessorFn: (r) => r.levels.join(", "),
    filterVariant: "multi-select",
    filterFn: (row, id, wanted: string[]) =>
      !wanted.length || row.original.levels.some((x) => wanted.includes(x)),
  },
];
function DataTable<T>(props: MaterialReactTableProps<T>) {
  const { columns, data, ...rest } = props;
  const t = useMaterialReactTable({ columns, data, ...rest });
  return <MaterialReactTable table={t} />;
}
function Toolbar({ table }: { table: MRT_TableInstance<RecordRow> }) {
  return (
    <div ref={table.refs.topToolbarRef}>
      <MRT_GlobalFilterTextField table={table} />
      <MRT_ToolbarDropZone table={table} />
      <MRT_TablePagination table={table} position="top" />
      <MRT_ToolbarAlertBanner table={table} stackAlertBanner />
    </div>
  );
}
export const app = (
  <DataTable<RecordRow>
    data={[{ id: "a", name: "A", levels: [] }]}
    columns={columns}
    getRowId={(r) => r.id}
    initialState={{ pagination: { pageSize: 15 }, density: "compact" }}
    enableGrouping
    enableColumnPinning
    renderTopToolbar={(p) => <Toolbar {...p} />}
    muiTableHeadCellProps={({ column }) => ({
      sx: (theme) => ({
        color: theme.palette.text.primary,
        backgroundColor: column.getIsPinned() ? "red" : "inherit",
      }),
    })}
    renderRowActionMenuItems={({ row, closeMenu }) => [
      <button key="copy" onClick={closeMenu}>
        {row.original.name}
      </button>,
    ]}
    renderTopToolbarCustomActions={({ table }) => (
      <button onClick={() => table.resetRowSelection()}>
        {table.getSelectedRowModel().rows.length}
      </button>
    )}
  />
);
const invalid: MRT_ColumnDef<RecordRow> = {
  header: "Invalid",
  // @ts-expect-error invalid field type
  accessorFn: (r) => r.name.toFixed(),
};
const editing: MaterialReactTableProps<RecordRow> = {
  columns,
  data: [],
  // @ts-expect-error editing is outside the supported options
  enableEditing: true,
};
