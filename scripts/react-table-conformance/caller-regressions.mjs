import React, { useMemo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
// Synthetic contracts for the resource/contest caller; no private app source.
const statusRank = (s) =>
  ({ closing: 0, open: 1, unlisted: 2, closed: 3, over: 4 })[s.kind];
const resourceColumns = (t) => [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "site", header: "Site" },
  {
    id: "kind",
    accessorFn: (r) => t("KIND_" + r.kind),
    header: "Kind",
    filterVariant: "select",
  },
  {
    id: "levels",
    accessorFn: (r) => r.levels.map((l) => t("LEVEL_" + l)).join(", "),
    header: "Levels",
    enableSorting: false,
    enableGrouping: false,
    filterVariant: "multi-select",
    filterSelectOptions: [
      "elementary",
      "middle",
      "high",
      "olympiad",
      "college",
    ].map((l) => t("LEVEL_" + l)),
    filterFn: (row, id, wanted) =>
      !wanted.length ||
      row.original.levels.some((l) => wanted.includes(t("LEVEL_" + l))),
  },
  {
    id: "cost",
    accessorFn: (r) => (r.cost ? t("COST_" + r.cost) : undefined),
    header: "Cost",
    filterVariant: "select",
    sortUndefined: "last",
  },
];
const contestColumns = (t) => [
  { accessorKey: "name", header: "Name" },
  {
    id: "date",
    accessorFn: (r) => r.date ?? undefined,
    header: "Date",
    sortUndefined: "last",
    enableColumnFilter: false,
    enableGrouping: false,
  },
  {
    id: "status",
    accessorFn: (r) => t("STATUS_" + r.status.kind),
    header: "Status",
    sortingFn: (a, b) =>
      statusRank(a.original.status) - statusRank(b.original.status),
    filterVariant: "select",
  },
  {
    id: "mode",
    accessorFn: (r) => t("MODE_" + r.mode),
    header: "Mode",
    filterVariant: "select",
  },
  {
    id: "format",
    accessorFn: (r) =>
      t(r.format === "online" ? "FORMAT_online" : "FORMAT_in_person"),
    header: "Format",
    filterVariant: "select",
  },
  { accessorKey: "grades", header: "Grades", sortUndefined: "last" },
  {
    accessorKey: "tough",
    header: "Difficulty",
    sortUndefined: "last",
    enableColumnFilter: false,
    enableGrouping: false,
  },
];
function DataTable(props) {
  const table = useMaterialReactTable({
    enableColumnFilterModes: true,
    enableColumnOrdering: true,
    enableGrouping: true,
    enableColumnPinning: true,
    enableFacetedValues: true,
    enableRowActions: true,
    enableRowSelection: true,
    enableStickyHeader: true,
    positionActionsColumn: "last",
    initialState: {
      density: "compact",
      showColumnFilters: false,
      showGlobalFilter: true,
      columnPinning: {
        left: ["mrt-row-expand", "mrt-row-select"],
        right: ["mrt-row-actions"],
      },
      pagination: { pageSize: 15 },
    },
    ...props,
  });
  window.callerTable = table;
  return h(MaterialReactTable, { table });
}
const theme = createTheme({ cssVariables: true }),
  h = React.createElement,
  wait = () => new Promise((r) => setTimeout(r, 100)),
  check = (v, m) => {
    if (!v) throw Error(m);
  },
  t = (k) => k;
const resources = [
  {
    id: "r-missing-a",
    name: "Algebra Archive",
    site: "A",
    kind: "archive",
    levels: ["middle", "high"],
  },
  {
    id: "r-paid",
    name: "Geometry Book",
    site: "B",
    kind: "book",
    levels: ["high", "olympiad"],
    cost: "paid",
  },
  {
    id: "r-free",
    name: "Algebra Course",
    site: "C",
    kind: "course",
    levels: ["middle", "college"],
    cost: "free",
  },
  {
    id: "r-missing-b",
    name: "Counting Archive",
    site: "D",
    kind: "archive",
    levels: ["elementary"],
  },
  {
    id: "r-mixed",
    name: "Number Theory Tool",
    site: "E",
    kind: "tool",
    levels: ["high", "college"],
    cost: "mixed",
  },
];
const contests = [
  {
    id: "c-unlisted",
    name: "Beta",
    date: null,
    status: { kind: "unlisted" },
    mode: "interest",
    format: "online",
  },
  {
    id: "c-closed",
    name: "Gamma",
    date: "2026-12-10",
    grades: "9–12",
    tough: 4,
    status: { kind: "closed" },
    mode: "external",
    format: "in-person",
  },
  {
    id: "c-closing",
    name: "Alpha",
    date: "2026-11-15",
    grades: "6–8",
    tough: 2,
    status: { kind: "closing", daysLeft: 2 },
    mode: "internal",
    format: "online",
  },
  {
    id: "c-open",
    name: "Delta",
    date: "2026-12-01",
    grades: "8–12",
    tough: 3,
    status: { kind: "open" },
    mode: "external",
    format: "online",
  },
  {
    id: "c-over",
    name: "Past",
    date: "2026-11-01",
    status: { kind: "over" },
    mode: "interest",
    format: "in-person",
  },
  {
    id: "c-missing",
    name: "Unknown",
    date: null,
    status: { kind: "closing", daysLeft: 0 },
    mode: "internal",
    format: "online",
  },
];
export default function setup(variant) {
  (window.callerCases ??= {})[variant] = async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host),
      snapshots = [];
    for (const [kind, data, factory] of [
      ["resources", resources, resourceColumns],
      ["contests", contests, contestColumns],
    ]) {
      function App() {
        const columns = useMemo(() => factory(t), []);
        return h(DataTable, {
          columns,
          data,
          getRowId: (r) => r.id,
          renderRowActions: ({ row }) =>
            h("button", { "data-row-action": row.id }, "Details"),
        });
      }
      flushSync(() =>
        root.render(h(ThemeProvider, { theme }, h(App, { key: kind }))),
      );
      await wait();
      check(host.querySelector("table"), "table mounted");
      let table = window.callerTable;
      const take = (label) => {
        table = window.callerTable;
        snapshots.push({
          kind,
          label,
          pagination: { ...table.getState().pagination },
          sorting: table.getState().sorting,
          rows: table.getRowModel().rows.map((r) => r.id),
          sorted: table.getPrePaginationRowModel().rows.map((r) => r.id),
          filtered: table.getFilteredRowModel().rows.map((r) => r.id),
          selected: table.getSelectedRowModel().rows.map((r) => r.id),
          facets: Object.fromEntries(
            table
              .getAllLeafColumns()
              .filter((c) => !c.id.startsWith("mrt-"))
              .map((c) => [c.id, [...c.getFacetedUniqueValues()]]),
          ),
          filters: table.getState().columnFilters,
          headers: table.getVisibleLeafColumns().map((c) => c.id),
          text: [...host.querySelectorAll("tbody tr")].map(
            (n) => n.textContent,
          ),
        });
      };
      const change = async (fn) => {
        flushSync(() => fn(window.callerTable));
        await wait();
        table = window.callerTable;
      };
      take("initial");
      for (const id of kind === "resources"
        ? ["cost"]
        : ["date", "grades", "tough"])
        for (const desc of [false, true]) {
          await change((t) => t.setSorting([{ id, desc }]));
          const rows = table.getPrePaginationRowModel().rows;
          let missing = false;
          for (const r of rows) {
            const v = r.getValue(id);
            if (v === undefined) missing = true;
            else check(!missing, kind + " " + id + " missing last " + desc);
          }
          take(id + " " + (desc ? "descending" : "ascending"));
        }
      if (kind === "contests")
        for (const desc of [false, true]) {
          await change((t) => t.setSorting([{ id: "status", desc }]));
          const ranks = table
            .getPrePaginationRowModel()
            .rows.map((r) => statusRank(r.original.status));
          check(
            ranks.every(
              (n, i) => !i || (desc ? n <= ranks[i - 1] : n >= ranks[i - 1]),
            ),
            "custom status sort",
          );
          take("status " + desc);
        }
      await change((t) => t.setSorting([]));
      await change((t) => t.setShowColumnFilters(true));
      take("filter controls shown");
      const choose = async (id, value) => {
        const header = [...host.querySelectorAll("thead th")].find((n) =>
          n.textContent.includes(table.getColumn(id).columnDef.header),
        );
        check(header, "filter header " + id);
        const combo = header.querySelector("[role=combobox]");
        check(combo, "combobox " + id);
        combo.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true, button: 0 }),
        );
        await wait();
        const list = document.querySelector("[role=listbox]");
        check(list, "filter list " + id);
        const option = [...list.querySelectorAll("[role=option]")].find(
          (n) => n.dataset.value === value,
        );
        check(option, "filter option " + value);
        option.click();
        await wait();
        table = window.callerTable;
      };
      const close = async () => {
        document.activeElement?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        await wait();
      };
      if (kind === "resources") {
        await choose("kind", "KIND_archive");
        check(
          table.getFilteredRowModel().rows.length === 2,
          "real select archive",
        );
        take("UI kind select");
        await change((t) => t.resetColumnFilters());
        await choose("levels", "LEVEL_middle");
        await close();
        await choose("levels", "LEVEL_olympiad");
        await close();
        check(
          table.getFilteredRowModel().rows.length === 3,
          "real multi-select OR",
        );
        take("UI level multi-select");
        await change((t) => t.resetColumnFilters());
      } else {
        await choose("status", "STATUS_open");
        check(
          table
            .getFilteredRowModel()
            .rows.map((r) => r.id)
            .join() === "c-open",
          "real status select",
        );
        take("UI status select");
        await change((t) => t.resetColumnFilters());
      }

      if (kind === "resources") {
        await change((t) =>
          t
            .getColumn("levels")
            .setFilterValue(["LEVEL_middle", "LEVEL_olympiad"]),
        );
        check(
          table.getFilteredRowModel().rows.length === 3,
          "custom OR multi filter",
        );
        take("levels multi");
        await change((t) => t.getColumn("kind").setFilterValue("KIND_archive"));
        check(
          table
            .getFilteredRowModel()
            .rows.map((r) => r.id)
            .join() === "r-missing-a",
          "combined select and multi",
        );
        take("combined filters");
        await change((t) => t.getColumn("kind").setFilterValue(undefined));
        await change((t) => t.getColumn("levels").setFilterValue([]));
        check(
          table.getFilteredRowModel().rows.length === 5,
          "empty multi releases filter",
        );
        take("clear multi");
      } else {
        await change((t) =>
          t.getColumn("mode").setFilterValue("MODE_external"),
        );
        check(table.getFilteredRowModel().rows.length === 2, "mode select");
        take("mode select");
        await change((t) =>
          t.getColumn("format").setFilterValue("FORMAT_online"),
        );
        check(
          table
            .getFilteredRowModel()
            .rows.map((r) => r.id)
            .join() === "c-open",
          "combined select",
        );
        take("two selects");
      }
      await change((t) => t.resetColumnFilters());
      await change((t) =>
        t.setGlobalFilter(kind === "resources" ? "Algebra" : "Alpha"),
      );
      take("global filter");
      check(
        table.getFilteredRowModel().rows.length ===
          (kind === "resources" ? 2 : 1),
        "global filter expected",
      );
      await change((t) => t.setGlobalFilter(""));
      await change((t) => t.setPagination({ pageIndex: 0, pageSize: 2 }));
      take("page 1");
      await change((t) => t.nextPage());
      take("page 2");
      await change((t) => t.toggleAllPageRowsSelected(true));
      check(table.getSelectedRowModel().rows.length === 2, "page selection");
      take("selected IDs");
      await change((t) =>
        t.setGrouping([kind === "resources" ? "kind" : "mode"]),
      );
      await change((t) => t.setExpanded(true));
      take("grouping");
      await change((t) => t.setGrouping([]));
      await change((t) => {
        t.setColumnOrder(["name", kind === "resources" ? "cost" : "status"]);
        t.getColumn("name").pin("left");
      });
      take("order and pin");
      check(host.querySelector("[data-row-action]"), "row action rendered");
      await change((t) => t.resetRowSelection());
      take("selection cleared");
      if (kind === "contests") {
        flushSync(() =>
          root.render(
            h(ThemeProvider, { theme }, h(App, { key: "fresh-group" })),
          ),
        );
        await wait();
        await change((t) => t.setPagination({ pageIndex: 0, pageSize: 50 }));
        await change((t) => t.setSorting([{ id: "status", desc: true }]));
        await change((t) => t.setGrouping(["mode"]));
        await change((t) => t.setExpanded(true));
        take("fresh custom-sort grouping");
      }
    }
    root.unmount();
    host.remove();
    return snapshots;
  };
}
