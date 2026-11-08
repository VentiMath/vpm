import {
  constructTable,
  tableFeatures,
  rowSortingFeature,
  createSortedRowModel,
  sortFn_basic,
  createColumnHelper,
  Row,
  Updater,
  TableState,
} from "vtanstack-table-core";
interface Product {
  id: string;
  name: string;
  price: number;
}
const h = createColumnHelper<Product>();
const price = h.accessor("price", {
  header: "Price",
  cell: ({ getValue }) => getValue().toFixed(2),
});
const t = constructTable({
  features: tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: { basic: sortFn_basic },
  }),
  data: [{ id: "1", name: "Book", price: 10 }],
  columns: [price, h.accessor((r) => r.name, { id: "name" })],
  getRowId: (r) => r.id,
});
t.setSorting([{ id: "price", desc: false }]);
const row: Row<Product> = t.getRowModel().rows[0];
const name: string = row.original.name;
const update: Updater<TableState["pagination"]> = (s) => ({
  ...s,
  pageIndex: 1,
});
t.setPagination(update);
void name;
// @ts-expect-error row IDs must be strings
constructTable({ data: [{ id: 1 }], columns: [], getRowId: (r) => r.id });
// @ts-expect-error invalid direction field
t.setSorting([{ id: "price", desc: "yes" }]);
// @ts-expect-error typed accessor value is a number
h.accessor("price", { cell: ({ getValue }) => getValue().toUpperCase() });
