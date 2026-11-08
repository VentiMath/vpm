import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { MenuItem } from "@mui/material";
import {
  MaterialReactTable,
  useMaterialReactTable,
  MRT_GlobalFilterTextField,
  MRT_LinearProgressBar,
  MRT_TablePagination,
  MRT_ToolbarAlertBanner,
  MRT_ToolbarDropZone,
  MRT_ToolbarInternalButtons,
} from "material-react-table";
const h = React.createElement,
  wait = () => new Promise((r) => setTimeout(r, 80));
const data = Array.from({ length: 21 }, (_, i) => ({
  id: "r" + i,
  name: "Problem " + i,
  team: i % 2 ? "Algebra" : "Geometry",
  score: 21 - i,
}));
const columns = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "team", header: "Team", filterVariant: "select" },
  { accessorKey: "score", header: "Score" },
];
function Toolbar({ table }) {
  return h(
    "div",
    { "data-custom-toolbar": true, ref: table.refs.topToolbarRef },
    h(MRT_ToolbarDropZone, { table }),
    h(MRT_GlobalFilterTextField, { table }),
    table.options.renderTopToolbarCustomActions?.({ table }),
    h(MRT_ToolbarInternalButtons, { table }),
    h(MRT_LinearProgressBar, { table, isTopToolbar: true }),
    h(MRT_ToolbarAlertBanner, { table }),
    h(MRT_TablePagination, { table, position: "top" }),
  );
}
export default function setup(variant) {
  (window.materialCases ??= {})[variant] = async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host),
      events = [];
    let table;
    const check = (ok, label) => {
      if (!ok) throw Error(variant + ": " + label);
    };
    function App({ tick = 0 }) {
      table = useMaterialReactTable({
        data,
        columns,
        getRowId: (r) => r.id,
        enableGrouping: true,
        enableRowSelection: true,
        enableRowActions: true,
        enableColumnOrdering: true,
        enableColumnPinning: true,
        enableFacetedValues: true,
        enableColumnFilterModes: true,
        enableFullScreenToggle: false,
        initialState: {
          pagination: { pageSize: 5, pageIndex: 0 },
          showGlobalFilter: true,
        },
        renderTopToolbar: (p) => h(Toolbar, p),
        renderRowActionMenuItems: ({ row, closeMenu }) => [
          h(
            MenuItem,
            {
              key: "copy",
              onClick: () => {
                events.push(row.id);
                closeMenu();
              },
            },
            "Copy " + row.id,
          ),
        ],
        renderTopToolbarCustomActions: ({ table }) =>
          h(
            "button",
            {
              onClick: () => {
                events.push(
                  table
                    .getSelectedRowModel()
                    .rows.map((r) => r.id)
                    .join(","),
                );
                table.resetRowSelection();
              },
            },
            "Copy selected",
          ),
      });
      return h(MaterialReactTable, { table });
    }
    const renderView = (mode = "light", tick = 0) =>
      root.render(
        h(
          ThemeProvider,
          { theme: createTheme({ palette: { mode }, cssVariables: true }) },
          h(App, { tick }),
        ),
      );
    renderView();
    await wait();
    check(host.querySelector("[data-custom-toolbar]"), "custom toolbar mounts");
    const click = async (label) => {
      const el = [...document.querySelectorAll("button,[role=menuitem]")].find(
        (el) =>
          el.getAttribute("aria-label") === label ||
          el.textContent === label ||
          el.title === label,
      );
      check(el, "control " + label);
      el.click();
      await wait();
    };
    // Actual pagination UI, rather than calling table.nextPage().
    const next = host.querySelector('button[aria-label="Go to next page"]');
    check(next, "next-page control");
    next.click();
    await wait();
    check(table.getState().pagination.pageIndex === 1, "next page persists");
    const select = host.querySelector("thead input[type=checkbox]");
    check(select, "select all");
    select.click();
    await wait();
    check(table.getSelectedRowModel().rows.length === 5, "page selection");
    await click("Copy selected");
    check(events[0] === "r5,r6,r7,r8,r9", "custom selected action");
    check(table.getSelectedRowModel().rows.length === 0, "selection reset");
    const action = [...host.querySelectorAll("button")].find((b) =>
      /row actions/i.test(b.getAttribute("aria-label") ?? b.title),
    );
    check(action, "row action trigger");
    action.click();
    await wait();
    await click("Copy r5");
    check(events[1] === "r5", "row action callback");
    await new Promise((r) => setTimeout(r, 250));
    check(!document.querySelector("[role=menu]"), "closeMenu closes menu");
    await click("Show/Hide filters");
    check(host.querySelector("thead [role=combobox]"), "column select visible");
    // Sorting through the header label.
    const sort = [...host.querySelectorAll("thead th")]
      .find((n) => n.textContent.includes("Score"))
      ?.querySelector(".MuiTableSortLabel-root");
    check(sort, "sort control");
    sort.click();
    await wait();
    check(table.getState().sorting[0]?.id === "score", "sort state");
    const before = table.getState().density;
    await click("Toggle density");
    check(table.getState().density !== before, "density");
    await click("Show/Hide columns");
    const item = [...document.querySelectorAll("[role=menuitem]")].find(
      (n) => n.textContent === "Team",
    );
    check(item, "visibility menu");
    const toggle = item.querySelector("input[type=checkbox]") ?? item;
    toggle.click();
    await wait();
    check(!table.getColumn("team").getIsVisible(), "hide");
    toggle.click();
    await wait();
    document.activeElement.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await wait();
    // Programmatic state changes exercise the public customization hooks too.
    table.setGrouping(["team"]);
    table.setExpanded(true);
    await wait();
    check(host.querySelectorAll("tbody tr").length > 0, "grouped rows");
    const input = host.querySelector('input[placeholder="Search"]');
    input.focus();
    const node = input;
    renderView("light", 1);
    await wait();
    check(
      host.contains(node) && document.activeElement === node,
      "focus survives parent rerender",
    );
    const result = {
      pageSelection: events[0],
      rowAction: events[1],
      grouping: table.getState().grouping,
      selected: table.getSelectedRowModel().rows.length,
    };
    if (window.keepMaterialPreview && variant === "vpm")
      window.materialSetMode = renderView;
    else {
      root.unmount();
      host.remove();
    }
    await wait();
    return result;
  };
}
