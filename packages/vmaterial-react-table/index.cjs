"use strict";
const React = require("react");
const { useTheme } = require("@mui/material/styles");
const {
  Box,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  TextField,
  MenuItem,
  Menu,
  Checkbox,
  IconButton,
  Button,
  LinearProgress,
  Alert,
  Chip,
  Pagination,
  FormControlLabel,
} = require("@mui/material");
const core = require("vtanstack-react-table");
const { rankItem } = require("vtanstack-match-sorter-utils");
const highlight = require("vhighlight-words").default;
const h = React.createElement;
const value = (p, ctx) => (typeof p === "function" ? p(ctx) : p);
const text = (x) => (x == null ? "" : String(x));
const folded = (x) => text(x).toLowerCase().trim();
const empty = (x) => x == null || x === "" || (Array.isArray(x) && !x.length);
const MRT_FilterFns = {
  fuzzy: (r, id, q, meta) => {
    const rank = rankItem(text(r.getValue(id)), text(q));
    meta?.({ itemRank: rank });
    return rank.passed;
  },
  contains: (r, id, q) => folded(r.getValue(id)).includes(folded(q)),
  startsWith: (r, id, q) => folded(r.getValue(id)).startsWith(folded(q)),
  endsWith: (r, id, q) => folded(r.getValue(id)).endsWith(folded(q)),
  equals: (r, id, q) => folded(r.getValue(id)) === folded(q),
  notEquals: (r, id, q) => folded(r.getValue(id)) !== folded(q),
  empty: (r, id) => empty(r.getValue(id)),
  notEmpty: (r, id) => !empty(r.getValue(id)),
  arrIncludesSome: (r, id, q) => !q?.length || q.includes(r.getValue(id)),
  greaterThan: (r, id, q) => r.getValue(id) > q,
  lessThan: (r, id, q) => r.getValue(id) < q,
};
for (const [name, fn] of Object.entries(MRT_FilterFns))
  fn.autoRemove = name === "empty" || name === "notEmpty" ? () => false : empty;
const labels = {
  search: "Search",
  showHideFilters: "Show/Hide filters",
  showHideColumns: "Show/Hide columns",
  toggleDensity: "Toggle density",
  toggleFullScreen: "Toggle full screen",
  actions: "Actions",
  select: "Select",
  expand: "Expand",
  noRecordsToDisplay: "No records to display",
  noResultsFound: "No results found",
  rowsPerPage: "Rows per page",
  clearSelection: "Clear selection",
  dropToGroupBy: "Drop here to group by",
  clearSort: "Clear sort",
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  hideColumn: "Hide column",
  pinLeft: "Pin left",
  pinRight: "Pin right",
  unpin: "Unpin",
  groupByColumn: "Group by column",
  ungroupByColumn: "Ungroup by column",
  moveLeft: "Move left",
  moveRight: "Move right",
  filterMode: "Filter mode",
};
const defaults = {
  enableGrouping: false,
  enableRowSelection: false,
  enableRowActions: false,
  enableColumnOrdering: false,
  enableColumnPinning: false,
  enableSorting: true,
  enableColumnFilters: true,
  enableGlobalFilter: true,
  enableColumnActions: true,
  enableHiding: true,
  enablePagination: true,
  enableToolbarInternalActions: true,
  enableTopToolbar: true,
  enableBottomToolbar: true,
  enableDensityToggle: true,
  enableFullScreenToggle: true,
  enableFilterMatchHighlighting: true,
  positionGlobalFilter: "right",
  positionPagination: "bottom",
  positionActionsColumn: "first",
  positionToolbarDropZone: "top",
  positionToolbarAlertBanner: "bottom",
  selectAllMode: "page",
  paginationDisplayMode: "default",
  globalFilterFn: "fuzzy",
};
const uiDefaults = {
  density: "comfortable",
  showColumnFilters: false,
  showGlobalFilter: false,
  isFullScreen: false,
  isLoading: false,
  showProgressBars: false,
  showAlertBanner: false,
  columnFilterFns: {},
  draggingColumn: null,
};
function useMaterialReactTable(input) {
  for (const name of [
    "enableEditing",
    "enableRowOrdering",
    "enableColumnResizing",
    "enableRowVirtualization",
    "enableColumnVirtualization",
  ])
    if (input[name])
      throw new RangeError(name + " is outside the flat DataTable contract");
  const theme = useTheme(),
    id = React.useId();
  const [ui, setUI] = React.useState(() => ({
    ...Object.fromEntries(
      Object.entries(uiDefaults).map(([k, v]) => [
        k,
        input.initialState?.[k] ?? v,
      ]),
    ),
    grouping: input.initialState?.grouping ?? [],
  }));
  const shown = { ...ui, ...input.state };
  const opts = {
    ...defaults,
    ...input,
    enablePagination:
      input.enablePagination === undefined ? true : input.enablePagination,
    localization: { ...labels, ...input.localization },
  };
  const filterFns = React.useMemo(
    () => ({ ...MRT_FilterFns, ...input.filterFns }),
    [input.filterFns],
  );
  const refs = React.useRef({
    topToolbarRef: { current: null },
    bottomToolbarRef: { current: null },
    tableContainerRef: { current: null },
    tableHeadRef: { current: null },
    tablePaperRef: { current: null },
  }).current;
  const setter = (key) => (updater) => {
    const handler =
      input["on" + key[0].toUpperCase() + key.slice(1) + "Change"];
    if (handler) handler(updater);
    else
      setUI((old) => ({
        ...old,
        [key]: core.functionalUpdate(updater, old[key]),
      }));
  };
  const columns = React.useMemo(() => {
    const cols = input.columns.map((c) => {
      if (c.columns?.length)
        throw new RangeError(
          "Nested headers are outside the flat DataTable contract",
        );
      const colId = c.id ?? c.accessorKey;
      return {
        ...c,
        filterFn:
          shown.columnFilterFns[colId] ??
          c.filterFn ??
          (c.filterVariant === "select"
            ? "equals"
            : c.filterVariant === "multi-select"
              ? "arrIncludesSome"
              : "fuzzy"),
      };
    });
    const display = (id, header, size) => ({
      id,
      header,
      size,
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      enableGrouping: false,
      enableHiding: false,
      columnDefType: "display",
      ...input.displayColumnDefOptions?.[id],
    });
    return [
      opts.enableRowActions &&
        display("mrt-row-actions", opts.localization.actions, 80),
      opts.enableGrouping &&
        shown.grouping?.length &&
        display("mrt-row-expand", opts.localization.expand, 60),
      opts.enableRowSelection &&
        display("mrt-row-select", opts.localization.select, 60),
      ...cols,
    ].filter(Boolean);
  }, [
    input.columns,
    input.displayColumnDefOptions,
    shown.columnFilterFns,
    shown.grouping,
    opts.enableRowActions,
    opts.enableRowSelection,
    opts.enableGrouping,
    opts.positionActionsColumn,
    input.localization,
  ]);
  const table = core.useReactTable({
    ...opts,
    columns,
    manualPagination: opts.enablePagination === false || opts.manualPagination,
    filterFns,
    initialState: {
      ...uiDefaults,
      columnOrder: [
        ...(opts.enableRowActions && opts.positionActionsColumn !== "last"
          ? ["mrt-row-actions"]
          : []),
        "mrt-row-expand",
        "mrt-row-select",
        ...input.columns.map((c) => c.id ?? c.accessorKey),
        ...(opts.enableRowActions && opts.positionActionsColumn === "last"
          ? ["mrt-row-actions"]
          : []),
      ],
      ...input.initialState,
    },
    state: { ...shown, ...input.state },
    onGroupingChange: (change) => {
      if (input.onGroupingChange) input.onGroupingChange(change);
      else
        setUI((old) => ({
          ...old,
          grouping: core.functionalUpdate(
            change,
            old.grouping ?? input.initialState?.grouping ?? [],
          ),
        }));
    },
    getCoreRowModel: core.getCoreRowModel(),
    getFilteredRowModel: core.getFilteredRowModel(),
    getSortedRowModel: core.getSortedRowModel(),
    getGroupedRowModel: core.getGroupedRowModel(),
    getExpandedRowModel: core.getExpandedRowModel(),
    getPaginationRowModel: core.getPaginationRowModel(),
    getFacetedRowModel: core.getFacetedRowModel(),
    getFacetedUniqueValues: core.getFacetedUniqueValues(),
    getFacetedMinMaxValues: core.getFacetedMinMaxValues(),
  });
  const snapshot = table.getState();
  const rankEnabled =
    opts.enableGlobalFilterRankedResults !== false &&
    opts.globalFilterFn === "fuzzy" &&
    !opts.manualFiltering &&
    !opts.manualSorting &&
    !opts.manualPagination &&
    !snapshot.grouping.length;
  const history = React.useRef({
    query: snapshot.globalFilter,
    sorting: snapshot.sorting,
  });
  React.useEffect(() => {
    const current = table.getState(),
      saved = history.current;
    if (current.sorting.length) saved.sorting = current.sorting;
    if (Object.is(saved.query, current.globalFilter)) return;
    saved.query = current.globalFilter;
    if (rankEnabled)
      table.setSorting(current.globalFilter ? [] : saved.sorting);
  }, [snapshot.globalFilter, snapshot.sorting, rankEnabled, table]);
  const models = React.useRef(null);
  if (!models.current) {
    const ordinary = table.getRowModel;
    const cache = {};
    models.current = cache;
    table.getRowModel = () => {
      const s = table.getState(),
        o = table.options;
      if (!o._mrtRank || !s.globalFilter || s.sorting.length) return ordinary();
      const source = table.getPrePaginationRowModel(),
        query = text(s.globalFilter),
        page = s.pagination;
      if (
        cache.source !== source ||
        cache.query !== query ||
        cache.page !== page ||
        cache.pagination !== o.enablePagination
      ) {
        const columns = table
          .getAllLeafColumns()
          .filter((c) => c.getCanGlobalFilter());
        const ranked = source.rows
          .map((row, i) => ({
            row,
            i,
            rank: Math.max(
              ...columns.map(
                (c) => rankItem(text(row.getValue(c.id)), query).rank,
              ),
            ),
          }))
          .sort((a, b) => b.rank - a.rank || a.i - b.i)
          .map((x) => x.row);
        const rows =
          o.enablePagination === false
            ? ranked
            : ranked.slice(
                page.pageIndex * page.pageSize,
                (page.pageIndex + 1) * page.pageSize,
              );
        Object.assign(cache, {
          source,
          query,
          page,
          pagination: o.enablePagination,
          result: { rows, flatRows: rows, rowsById: source.rowsById },
        });
      }
      return cache.result;
    };
  }
  table.options._mrtRank = rankEnabled;
  table.refs = refs;
  table.options.mrtTheme = {
    baseBackgroundColor: theme.palette.background.paper,
    menuBackgroundColor: theme.palette.background.paper,
    pinnedColumnBackgroundColor: theme.palette.background.paper,
    ...value(input.mrtTheme, theme),
  };
  table._mrtId = id;
  for (const key of Object.keys(uiDefaults))
    table["set" + key[0].toUpperCase() + key.slice(1)] = setter(key);
  return table;
}
function icon(table, name, fallback) {
  const C = table.options.icons?.[name];
  return C
    ? h(C, { fontSize: "small" })
    : h("span", { "aria-hidden": true }, fallback);
}
function action(table, label, fn, iconName, fallback, props = {}) {
  return h(
    IconButton,
    { size: "small", "aria-label": label, title: label, onClick: fn, ...props },
    icon(table, iconName, fallback),
  );
}
function propsFor(table, name, ctx = {}) {
  return value(table.options[name], { table, ...ctx }) || {};
}
function MRT_GlobalFilterTextField({ table, ...rest }) {
  if (!table.getState().showGlobalFilter) return null;
  const supplied = propsFor(table, "muiSearchTextFieldProps");
  return h(TextField, {
    size: "small",
    placeholder: table.options.localization.search,
    ...supplied,
    ...rest,
    value: table.getState().globalFilter ?? "",
    onChange: (e) => {
      table.setGlobalFilter(e.target.value || undefined);
      supplied.onChange?.(e);
    },
    slotProps: {
      ...supplied.slotProps,
      htmlInput: {
        "aria-label": table.options.localization.search,
        ...supplied.slotProps?.htmlInput,
      },
    },
  });
}
function MRT_LinearProgressBar({ table, isTopToolbar, ...rest }) {
  return table.getState().isLoading || table.getState().showProgressBars
    ? h(LinearProgress, {
        "aria-label": "Loading",
        ...propsFor(table, "muiLinearProgressProps", { isTopToolbar }),
        ...rest,
      })
    : null;
}
function MRT_ToolbarAlertBanner({ table, stackAlertBanner, ...rest }) {
  const n = table
    .getSelectedRowModel()
    .flatRows.filter((r) => !r.getIsGrouped()).length;
  if (!n && !table.getState().showAlertBanner) return null;
  const p = propsFor(table, "muiToolbarAlertBannerProps");
  return h(
    Alert,
    { severity: "info", ...p, ...rest },
    n
      ? h(
          React.Fragment,
          null,
          `${n} of ${table.getCoreRowModel().rows.length} row(s) selected`,
          h(
            Button,
            { size: "small", onClick: () => table.resetRowSelection() },
            table.options.localization.clearSelection,
          ),
        )
      : p.children,
  );
}
function MRT_TablePagination({ table, position, ...rest }) {
  const o = table.options,
    s = table.getState().pagination,
    p = propsFor(table, "muiPaginationProps"),
    count = table.getPageCount();
  const {
    rowsPerPageOptions = [5, 10, 15, 20, 25, 50, 100],
    showRowsPerPage = true,
    ...paginationProps
  } = p;
  const options = [...new Set([...rowsPerPageOptions, s.pageSize])];
  return h(
    Box,
    {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 1,
      sx: { p: 1, flexWrap: "wrap" },
      ...rest,
    },
    showRowsPerPage &&
      h(
        TextField,
        {
          select: true,
          size: "small",
          label: o.localization.rowsPerPage,
          sx: { minWidth: 130 },
          value: s.pageSize,
          onChange: (e) => table.setPageSize(Number(e.target.value)),
        },
        options.map((n) => h(MenuItem, { key: n, value: n }, n)),
      ),
    h(Pagination, {
      count: Math.max(1, count),
      page: s.pageIndex + 1,
      onChange: (_, n) => table.setPageIndex(n - 1),
      size: "small",
      showFirstButton: true,
      showLastButton: true,
      ...paginationProps,
      disabled: count === 0,
    }),
  );
}
function MRT_ToolbarDropZone({ table, ...rest }) {
  if (!table.options.enableGrouping) return null;
  return h(
    Box,
    {
      role: "group",
      "aria-label": "Grouped columns",
      onDragOver: (e) => e.preventDefault(),
      onDrop: (e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        const col = table.getColumn(id);
        if (col?.getCanGroup()) col.toggleGrouping();
        table.setDraggingColumn(null);
      },
      sx: { display: "flex", gap: 1, alignItems: "center", minHeight: 32 },
      ...rest,
    },
    table.getState().grouping.length
      ? table
          .getState()
          .grouping.map((id) =>
            h(Chip, {
              key: id,
              label: table.getColumn(id).columnDef.header,
              onDelete: () => table.getColumn(id).toggleGrouping(),
              size: "small",
            }),
          )
      : table.options.localization.dropToGroupBy,
  );
}
function MRT_ToolbarInternalButtons({ table, ...rest }) {
  const [anchor, setAnchor] = React.useState(null),
    o = table.options,
    l = o.localization;
  return h(
    Box,
    { display: "flex", ...rest },
    o.enableGlobalFilter &&
      action(
        table,
        l.search,
        () => table.setShowGlobalFilter((x) => !x),
        "SearchIcon",
        "⌕",
      ),
    o.enableColumnFilters &&
      action(
        table,
        l.showHideFilters,
        () => table.setShowColumnFilters((x) => !x),
        "FilterListIcon",
        "☷",
      ),
    o.enableHiding &&
      action(
        table,
        l.showHideColumns,
        (e) => setAnchor(e.currentTarget),
        "ViewColumnIcon",
        "▥",
      ),
    o.enableDensityToggle &&
      action(
        table,
        l.toggleDensity,
        () =>
          table.setDensity(
            (d) =>
              ({
                comfortable: "compact",
                compact: "spacious",
                spacious: "comfortable",
              })[d],
          ),
        "DensitySmallIcon",
        "↕",
      ),
    o.enableFullScreenToggle &&
      action(
        table,
        l.toggleFullScreen,
        () => table.setIsFullScreen((x) => !x),
        "FullscreenIcon",
        "⛶",
      ),
    h(
      Menu,
      { anchorEl: anchor, open: !!anchor, onClose: () => setAnchor(null) },
      table
        .getAllLeafColumns()
        .filter((c) => c.getCanHide())
        .map((c) =>
          h(
            MenuItem,
            { key: c.id, onClick: () => c.toggleVisibility() },
            h(Checkbox, { checked: c.getIsVisible(), tabIndex: -1 }),
            text(c.columnDef.header),
          ),
        ),
    ),
  );
}
function Toolbar({ table }) {
  const o = table.options;
  return h(
    Box,
    {
      ...propsFor(table, "muiTopToolbarProps"),
      ref: table.refs.topToolbarRef,
      sx: { p: 1 },
    },
    ["top", "both"].includes(o.positionToolbarDropZone) &&
      h(MRT_ToolbarDropZone, { table }),
    h(
      Box,
      {
        display: "flex",
        gap: 1,
        alignItems: "center",
        justifyContent: "space-between",
      },
      o.positionGlobalFilter === "left" &&
        h(MRT_GlobalFilterTextField, { table }),
      o.renderTopToolbarCustomActions?.({ table }),
      o.positionGlobalFilter === "right" &&
        h(MRT_GlobalFilterTextField, { table }),
      o.enableToolbarInternalActions &&
        h(MRT_ToolbarInternalButtons, { table }),
    ),
    ["top", "both"].includes(o.positionPagination) &&
      h(MRT_TablePagination, { table, position: "top" }),
    o.positionToolbarAlertBanner === "top" &&
      h(MRT_ToolbarAlertBanner, { table }),
    h(MRT_LinearProgressBar, { table, isTopToolbar: true }),
  );
}
function Filter({ table, column }) {
  const c = column.columnDef,
    selected = column.getFilterValue(),
    l = table.options.localization;
  const [anchor, setAnchor] = React.useState(null);
  const multi = c.filterVariant === "multi-select",
    select = multi || c.filterVariant === "select";
  const opts = select
    ? (c.filterSelectOptions ??
      [...column.getFacetedUniqueValues().keys()]
        .filter((x) => x != null)
        .sort())
    : [];
  const supplied = {
    ...propsFor(table, "muiFilterTextFieldProps", { column }),
    ...value(c.muiFilterTextFieldProps, { table, column }),
  };
  const activeMode = table.getState().columnFilterFns[column.id] ?? c.filterFn;
  return h(
    Box,
    { display: "flex", alignItems: "center" },
    h(
      TextField,
      {
        size: "small",
        ...supplied,
        select,
        value: selected ?? (multi ? [] : ""),
        placeholder: `Filter by ${text(c.header)}`,
        onChange: (e) => {
          column.setFilterValue(
            e.target.value === "" ? undefined : e.target.value,
          );
          supplied.onChange?.(e);
        },
        slotProps: {
          ...supplied.slotProps,
          htmlInput: {
            "aria-label": `Filter by ${text(c.header)}`,
            ...supplied.slotProps?.htmlInput,
          },
          ...(select
            ? {
                select: {
                  multiple: multi,
                  displayEmpty: true,
                  SelectDisplayProps: {
                    "aria-label": `Filter by ${text(c.header)}`,
                  },
                  ...supplied.slotProps?.select,
                },
              }
            : {}),
        },
      },
      select && !multi && h(MenuItem, { value: "" }, "All"),
      ...opts.map((x, i) => {
        const v = typeof x === "object" ? (x.value ?? x.label) : x;
        return h(
          MenuItem,
          { key: i, value: v },
          typeof x === "object" ? (x.label ?? x.value) : x,
        );
      }),
    ),
    table.options.enableColumnFilterModes &&
      !select &&
      typeof c.filterFn !== "function" &&
      action(
        table,
        l.filterMode,
        (e) => setAnchor(e.currentTarget),
        "FilterListIcon",
        "⋮",
      ),
    h(
      Menu,
      { anchorEl: anchor, open: !!anchor, onClose: () => setAnchor(null) },
      [
        "fuzzy",
        "contains",
        "startsWith",
        "endsWith",
        "equals",
        "notEquals",
        "empty",
        "notEmpty",
        "greaterThan",
        "lessThan",
      ].map((mode) =>
        h(
          MenuItem,
          {
            key: mode,
            selected: mode === activeMode,
            onClick: () => {
              table.setColumnFilterFns((old) => ({
                ...old,
                [column.id]: mode,
              }));
              if (mode === "empty" || mode === "notEmpty")
                column.setFilterValue(" ");
              setAnchor(null);
            },
          },
          mode,
        ),
      ),
    ),
  );
}
function pinStyle(table, column) {
  const side = column.getIsPinned();
  return side
    ? {
        position: "sticky",
        [side]:
          side === "left" ? column.getStart("left") : column.getAfter("right"),
        zIndex: 2,
        backgroundColor: table.options.mrtTheme.pinnedColumnBackgroundColor,
      }
    : {};
}
function HeaderCell({ table, column }) {
  const [anchor, setAnchor] = React.useState(null),
    c = column.columnDef,
    l = table.options.localization;
  const move = (delta) => {
    const ids = table.getAllLeafColumns().map((x) => x.id),
      i = ids.indexOf(c.id ?? c.accessorKey),
      j = i + delta;
    if (j >= 0 && j < ids.length) {
      [ids[i], ids[j]] = [ids[j], ids[i]];
      table.setColumnOrder(ids);
    }
    setAnchor(null);
  };
  const command = (label, fn) =>
    h(
      MenuItem,
      {
        key: label,
        onClick: () => {
          fn();
          setAnchor(null);
        },
      },
      label,
    );
  const supplied = {
    ...propsFor(table, "muiTableHeadCellProps", { column }),
    ...value(c.muiTableHeadCellProps, { table, column }),
  };
  return h(
    TableCell,
    {
      ...supplied,
      "data-column-id": column.id,
      sortDirection: column.getIsSorted() || false,
      onDragOver: (e) => {
        if (table.options.enableColumnOrdering) e.preventDefault();
      },
      onDrop: (e) => {
        if (!table.options.enableColumnOrdering) return;
        e.preventDefault();
        const source = e.dataTransfer.getData("text/plain"),
          ids = table.getAllLeafColumns().map((c) => c.id),
          from = ids.indexOf(source),
          to = ids.indexOf(column.id);
        if (from >= 0 && to >= 0 && from !== to) {
          ids.splice(from, 1);
          ids.splice(to, 0, source);
          table.setColumnOrder(ids);
        }
        table.setDraggingColumn(null);
      },
      sx: [
        { minWidth: column.getSize(), ...pinStyle(table, column) },
        supplied.sx,
      ],
    },
    column.id === "mrt-row-select"
      ? h(Checkbox, {
          ...propsFor(table, "muiSelectAllCheckboxProps"),
          checked:
            table.options.selectAllMode === "all"
              ? table.getIsAllRowsSelected()
              : table.getIsAllPageRowsSelected(),
          indeterminate:
            table.options.selectAllMode === "all"
              ? table.getIsSomeRowsSelected()
              : table.getIsSomePageRowsSelected(),
          onChange:
            table.options.selectAllMode === "all"
              ? table.getToggleAllRowsSelectedHandler()
              : table.getToggleAllPageRowsSelectedHandler(),
          slotProps: { input: { "aria-label": "Toggle select all" } },
        })
      : h(
          Box,
          {
            className: "Mui-TableHeadCell-Content",
            display: "flex",
            alignItems: "center",
          },
          h(
            Box,
            {
              className: "Mui-TableHeadCell-Content-Labels",
              display: "flex",
              flex: 1,
            },
            column.getCanSort()
              ? h(
                  TableSortLabel,
                  {
                    active: !!column.getIsSorted(),
                    direction: column.getIsSorted() || "asc",
                    onClick: column.getToggleSortingHandler(),
                  },
                  c.header,
                )
              : c.header,
          ),
          c.columnDefType !== "display" &&
            h(
              Box,
              {
                className: "Mui-TableHeadCell-Content-Actions",
                display: "flex",
              },
              table.options.enableColumnOrdering &&
                action(
                  table,
                  `Move ${text(c.header)}`,
                  () => {},
                  "DragHandleIcon",
                  "⠿",
                  {
                    draggable: true,
                    onDragStart: (e) => {
                      e.dataTransfer.setData("text/plain", column.id);
                      table.setDraggingColumn(column);
                    },
                    onDragEnd: () => table.setDraggingColumn(null),
                    onKeyDown: (e) => {
                      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                        e.preventDefault();
                        move(e.key === "ArrowLeft" ? -1 : 1);
                      }
                    },
                  },
                ),
              table.options.enableColumnActions &&
                action(
                  table,
                  `Column Actions ${text(c.header)}`,
                  (e) => setAnchor(e.currentTarget),
                  "MoreVertIcon",
                  "⋮",
                ),
            ),
        ),
    table.getState().showColumnFilters &&
      column.getCanFilter() &&
      h(Filter, { table, column }),
    h(
      Menu,
      { anchorEl: anchor, open: !!anchor, onClose: () => setAnchor(null) },
      column.getCanSort() && [
        command(l.sortAscending, () => column.toggleSorting(false)),
        command(l.sortDescending, () => column.toggleSorting(true)),
        command(l.clearSort, () => column.clearSorting()),
      ],
      column.getCanGroup() &&
        command(
          column.getIsGrouped() ? l.ungroupByColumn : l.groupByColumn,
          () => column.toggleGrouping(),
        ),
      column.getCanHide() &&
        command(l.hideColumn, () => column.toggleVisibility(false)),
      table.options.enableColumnPinning &&
        column.getCanPin() && [
          command(l.pinLeft, () => column.pin("left")),
          command(l.pinRight, () => column.pin("right")),
          command(l.unpin, () => column.pin(false)),
        ],
      table.options.enableColumnOrdering && [
        command(l.moveLeft, () => move(-1)),
        command(l.moveRight, () => move(1)),
      ],
    ),
  );
}
function RowActions({ table, row }) {
  const [anchor, setAnchor] = React.useState(null),
    closeMenu = () => setAnchor(null);
  if (table.options.renderRowActions)
    return table.options.renderRowActions({ row, table });
  return h(
    React.Fragment,
    null,
    action(
      table,
      `Row Actions ${row.index + 1}`,
      (e) => setAnchor(e.currentTarget),
      "MoreHorizIcon",
      "⋯",
    ),
    h(
      Menu,
      { anchorEl: anchor, open: !!anchor, onClose: closeMenu },
      anchor
        ? table.options.renderRowActionMenuItems?.({ row, table, closeMenu })
        : null,
    ),
  );
}
function BodyCell({ table, cell }) {
  const { column, row } = cell,
    c = column.columnDef;
  let content;
  if (column.id === "mrt-row-select")
    content = h(Checkbox, {
      ...propsFor(table, "muiSelectCheckboxProps", { row }),
      disabled: !row.getCanSelect(),
      checked: row.getIsSelected(),
      indeterminate: row.getIsSomeSelected(),
      onChange: row.getToggleSelectedHandler(),
      slotProps: {
        input: { "aria-label": `Toggle select row ${row.index + 1}` },
      },
    });
  else if (column.id === "mrt-row-expand")
    content = row.getCanExpand()
      ? action(
          table,
          row.getIsExpanded() ? "Collapse" : "Expand",
          row.getToggleExpandedHandler(),
          "ExpandMoreIcon",
          row.getIsExpanded() ? "▾" : "▸",
          { "aria-expanded": row.getIsExpanded() },
        )
      : null;
  else if (column.id === "mrt-row-actions")
    content = row.getIsGrouped() ? null : h(RowActions, { table, row });
  else if (cell.getIsPlaceholder()) content = null;
  else if (cell.getIsGrouped())
    content = h(
      React.Fragment,
      null,
      text(cell.getValue()),
      ` (${row.subRows.length})`,
    );
  else if (cell.getIsAggregated())
    content = c.AggregatedCell
      ? h(c.AggregatedCell, { cell, column, row, table })
      : text(cell.getValue());
  else if (c.Cell)
    content = h(c.Cell, {
      cell,
      column,
      row,
      table,
      renderedCellValue: cell.renderValue(),
    });
  else {
    const raw = text(cell.renderValue()),
      q = column.getFilterValue() ?? table.getState().globalFilter;
    content =
      table.options.enableFilterMatchHighlighting &&
      typeof q === "string" &&
      q.trim()
        ? highlight({ text: raw, query: q }).map((x) =>
            x.match
              ? h("mark", { key: x.key }, x.text)
              : h(React.Fragment, { key: x.key }, x.text),
          )
        : raw;
  }
  const supplied = {
    ...propsFor(table, "muiTableBodyCellProps", { cell, column, row }),
    ...value(c.muiTableBodyCellProps, { cell, column, row, table }),
  };
  return h(
    TableCell,
    {
      ...supplied,
      "data-column-id": column.id,
      sx: [pinStyle(table, column), supplied.sx],
    },
    content,
  );
}
function View({ table }) {
  const o = table.options,
    s = table.getState(),
    cols = [
      ...table.getLeftVisibleLeafColumns(),
      ...table.getCenterVisibleLeafColumns(),
      ...table.getRightVisibleLeafColumns(),
    ],
    rows = table.getRowModel().rows;
  const paper = propsFor(table, "muiTablePaperProps"),
    container = propsFor(table, "muiTableContainerProps");
  return h(
    Paper,
    {
      ...paper,
      ref: table.refs.tablePaperRef,
      "data-vpm": "material-react-table",
      sx: [
        {
          backgroundColor: o.mrtTheme.baseBackgroundColor,
          ...(s.isFullScreen
            ? { position: "fixed", inset: 0, zIndex: 1300, overflow: "auto" }
            : {}),
        },
        paper.sx,
      ],
    },
    o.enableTopToolbar &&
      (o.renderTopToolbar
        ? value(o.renderTopToolbar, { table })
        : h(Toolbar, { table })),
    h(
      TableContainer,
      { ...container, ref: table.refs.tableContainerRef },
      h(
        Table,
        {
          ...propsFor(table, "muiTableProps"),
          size: s.density === "compact" ? "small" : "medium",
          stickyHeader: o.enableStickyHeader,
          "aria-label": o.localization.table ?? "Data table",
          sx: s.density === "spacious" ? { "& td": { py: 3 } } : undefined,
        },
        h(
          TableHead,
          { ref: table.refs.tableHeadRef },
          h(
            TableRow,
            null,
            cols.map((column) =>
              h(HeaderCell, { key: column.id, table, column }),
            ),
          ),
        ),
        h(
          TableBody,
          { ...propsFor(table, "muiTableBodyProps") },
          rows.length
            ? rows.map((row) =>
                h(
                  TableRow,
                  {
                    key: row.id,
                    ...propsFor(table, "muiTableBodyRowProps", { row }),
                    "data-row-id": row.id,
                    selected: row.getIsSelected(),
                  },
                  row
                    .getVisibleCells()
                    .map((cell) => h(BodyCell, { key: cell.id, table, cell })),
                ),
              )
            : h(
                TableRow,
                null,
                h(
                  TableCell,
                  { colSpan: cols.length },
                  s.isLoading
                    ? "Loading…"
                    : table.getCoreRowModel().rows.length
                      ? o.localization.noResultsFound
                      : o.localization.noRecordsToDisplay,
                ),
              ),
        ),
      ),
    ),
    o.enableBottomToolbar &&
      h(
        Box,
        {
          ...propsFor(table, "muiBottomToolbarProps"),
          ref: table.refs.bottomToolbarRef,
        },
        o.positionToolbarAlertBanner === "bottom" &&
          h(MRT_ToolbarAlertBanner, { table }),
        ["bottom", "both"].includes(o.positionToolbarDropZone) &&
          h(MRT_ToolbarDropZone, { table }),
        o.renderBottomToolbarCustomActions?.({ table }),
        o.enablePagination &&
          ["bottom", "both"].includes(o.positionPagination) &&
          h(MRT_TablePagination, { table, position: "bottom" }),
      ),
  );
}
function Owned(props) {
  const table = useMaterialReactTable(props);
  return h(View, { table });
}
function MaterialReactTable(props) {
  return props.table ? h(View, { table: props.table }) : h(Owned, props);
}
module.exports = {
  MaterialReactTable,
  useMaterialReactTable,
  MRT_GlobalFilterTextField,
  MRT_LinearProgressBar,
  MRT_TablePagination,
  MRT_ToolbarAlertBanner,
  MRT_ToolbarDropZone,
  MRT_ToolbarInternalButtons,
  MRT_FilterFns,
};
