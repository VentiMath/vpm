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
    table.options.enablePagination &&
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
    function App({ tick = 0, paginationOptions = {}, records = data }) {
      table = useMaterialReactTable({
        data: records,
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
        ...paginationOptions,
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
    const renderView = (
      mode = "light",
      tick = 0,
      paginationOptions = {},
      records = data,
    ) =>
      root.render(
        h(
          ThemeProvider,
          { theme: createTheme({ palette: { mode }, cssVariables: true }) },
          h(App, { tick, paginationOptions, records }),
        ),
      );
    renderView();
    await wait();
    check(host.querySelector("[data-custom-toolbar]"), "custom toolbar mounts");
    for (const options of [
      {},
      { enablePagination: false },
      { enablePagination: true },
      { enablePagination: undefined },
    ]) {
      renderView("light", 0, options);
      await wait();
      const enabled = options.enablePagination !== false;
      check(
        table.options.enablePagination === enabled,
        "resolved pagination option",
      );
      check(
        Boolean(
          host.querySelector(
            '[data-custom-toolbar] button[aria-label="Go to next page"]',
          ),
        ) === enabled,
        "custom toolbar follows pagination option",
      );
      check(
        host.querySelectorAll("tbody tr").length ===
          (enabled ? 5 : data.length),
        "pagination option controls visible rows after rerender",
      );
    }
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
    // Match the app's collapsed-group/copy path with synthetic flat records:
    // the first 15 groups own 27 leaves; the other 17 leaves are on page 2+.
    const groupedRecords = Array.from({ length: 44 }, (_, i) => ({
      id: "g" + i,
      name: "Resource " + i,
      team: "Site " + (i < 24 ? Math.floor(i / 2) : i - 12),
      score: i,
    }));
    renderView("light", 2, {}, groupedRecords);
    await wait();
    // Settle each public update before the next; the upstream adapter reads
    // current state when composing some updates.
    for (const update of [
      () => table.resetRowSelection(),
      () => table.setSorting([]),
      () => table.setColumnFilters([]),
      () => table.setGlobalFilter(""),
      () => table.setGrouping(["team"]),
      () => table.setExpanded({}),
    ]) {
      update();
      await wait();
    }
    table.setPagination({ pageIndex: 0, pageSize: 15 });
    await wait();
    let header = host.querySelector("thead input[type=checkbox]");
    check(
      header && !header.checked,
      "collapsed grouped header begins unchecked",
    );
    header.click();
    await wait();
    const groupedIds = table.getSelectedRowModel().rows.map((row) => row.id);
    check(
      groupedIds.join(",") ===
        groupedRecords
          .slice(0, 27)
          .map((row) => row.id)
          .join(","),
      "collapsed header selects exactly 27 leaf resources: " +
        JSON.stringify({
          groupedIds,
          state: table.getState().pagination,
          groups: table
            .getRowModel()
            .rows.map((row) => [row.id, row.subRows.length]),
        }),
    );
    check(header.checked, "collapsed grouped header is checked");
    await click("Copy selected");
    check(
      events.at(-1) === groupedIds.join(","),
      "copy action receives grouped descendants",
    );
    const groupCheck = host.querySelector("tbody input[type=checkbox]");
    check(groupCheck, "collapsed group checkbox exists");
    groupCheck.click();
    await wait();
    check(
      table.getSelectedRowModel().rows.length === 2,
      "individual group selects two leaves",
    );
    header = host.querySelector("thead input[type=checkbox]");
    check(
      !header.checked && header.getAttribute("data-indeterminate") === "true",
      "header reflects partial descendant selection",
    );
    // Click the partial header to select its page, then clear through the UI.
    header.click();
    await wait();
    header.click();
    await wait();
    check(
      table.getSelectedRowModel().rows.length === 0 && !header.checked,
      "header clears every selected descendant",
    );
    groupCheck.click();
    await wait();
    table.getToggleAllPageRowsSelectedHandler()({ target: { checked: false } });
    await wait();
    check(
      table.getSelectedRowModel().rows.length === 0,
      "explicit header clear removes individual group selection",
    );
    table.setPageIndex(1);
    await wait();
    header.click();
    await wait();
    const secondIds = table.getSelectedRowModel().rows.map((row) => row.id);
    check(
      secondIds.length === 15 && secondIds[0] === "g27",
      "next grouped page selects only its descendants",
    );
    table.setPageIndex(0);
    await wait();
    table.toggleAllPageRowsSelected(false);
    await wait();
    check(
      table
        .getSelectedRowModel()
        .rows.map((row) => row.id)
        .join(",") === secondIds.join(","),
      "clearing first page preserves second-page selection",
    );
    table.resetRowSelection();
    await wait();
    const result = {
      groupedSelection: groupedIds,
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
