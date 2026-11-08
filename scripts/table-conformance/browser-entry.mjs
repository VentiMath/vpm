import React from "react";
import { createRoot } from "react-dom/client";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { data } from "./cases.cjs";
export default function setup(variant) {
  (window.tableCases ??= {})[variant] = async () => {
    const host = document.createElement("div");
    document.body.append(host);
    let table, replace;
    const columns = [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "category", header: "Category" },
      { accessorKey: "price", header: "Price" },
      {
        accessorKey: "active",
        header: "Active",
        Cell: ({ cell }) => String(cell.getValue()),
      },
    ];
    function App() {
      const [rows, setRows] = React.useState(data);
      replace = setRows;
      table = useMaterialReactTable({
        columns,
        data: rows,
        getRowId: (r) => r.id,
        enableColumnFilterModes: true,
        enableColumnOrdering: true,
        enableGrouping: true,
        enableColumnPinning: true,
        enableFacetedValues: true,
        enableRowActions: true,
        enableRowSelection: true,
        enableStickyHeader: true,
        autoResetPageIndex: false,
        initialState: {
          density: "compact",
          pagination: { pageIndex: 0, pageSize: 15 },
          columnPinning: {
            left: ["mrt-row-expand", "mrt-row-select"],
            right: ["mrt-row-actions"],
          },
          showGlobalFilter: true,
        },
        renderRowActions: ({ row }) =>
          React.createElement("button", { "data-action": row.id }, "Edit"),
      });
      return React.createElement(MaterialReactTable, { table });
    }
    const root = createRoot(host);
    root.render(React.createElement(App));
    const settle = () => new Promise((r) => setTimeout(r, 120));
    await settle();
    const out = [];
    const take = (label) => {
      if (!host.querySelector("table")) throw Error("Table did not mount");
      out.push({
        label,
        rows: [...host.querySelectorAll("tbody tr")].map((r) => r.textContent),
        headers: [...host.querySelectorAll("thead th")].map(
          (h) => h.textContent,
        ),
        ids: table.getRowModel().rows.map((r) => r.id),
        selected: table.getSelectedRowModel().rows.map((r) => r.id),
        count: table.getRowCount(),
        pages: table.getPageCount(),
      });
    };
    take("initial");
    const sort = host.querySelector('th[data-index="3"] button');
    table.getColumn("price").toggleSorting(false);
    await settle();
    take("sort");
    table.nextPage();
    await settle();
    take("page");
    table.setGlobalFilter("Algebra");
    table.firstPage();
    await settle();
    take("filter");
    host.querySelector('tbody input[type="checkbox"]').click();
    await settle();
    take("checkbox");
    table.getColumn("active").toggleVisibility(false);
    table.getColumn("name").pin("left");
    await settle();
    take("pin hide");
    table.setGlobalFilter("");
    table.setGrouping(["category"]);
    table.setExpanded(true);
    await settle();
    take("group expand");
    table.setGrouping([]);
    replace(data.slice(0, 7));
    await settle();
    take("replace");
    root.unmount();
    host.remove();
    return out;
  };
}
