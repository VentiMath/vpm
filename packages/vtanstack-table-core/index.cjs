"use strict";
const { createAtom, shallow, batch } = require("vtanstack-store");
const f = require("./functions.cjs"),
  { functionalUpdate, sortFns, filterFns, aggregationFns } = f;
const empty = () => ({ rows: [], flatRows: [], rowsById: Object.create(null) });
const cap = (name) => name[0].toUpperCase() + name.slice(1);
const blank = () => ({
  columnVisibility: {},
  columnOrder: [],
  columnPinning: { left: [], right: [] },
  rowPinning: { top: [], bottom: [] },
  columnFilters: [],
  globalFilter: undefined,
  sorting: [],
  grouping: [],
  expanded: {},
  pagination: { pageIndex: 0, pageSize: 10 },
  rowSelection: {},
  columnSizing: {},
  columnSizingInfo: {
    startOffset: null,
    startSize: null,
    deltaOffset: null,
    deltaPercentage: null,
    isResizingColumn: false,
    columnSizingStart: [],
  },
});
const featureSlices = {
  columnVisibilityFeature: "columnVisibility",
  columnOrderingFeature: "columnOrder",
  columnPinningFeature: "columnPinning",
  rowPinningFeature: "rowPinning",
  columnFilteringFeature: "columnFilters",
  globalFilteringFeature: "globalFilter",
  rowSortingFeature: "sorting",
  columnGroupingFeature: "grouping",
  rowExpandingFeature: "expanded",
  rowPaginationFeature: "pagination",
  rowSelectionFeature: "rowSelection",
  columnSizingFeature: "columnSizing",
};
const features = Object.fromEntries(
  Object.keys(featureSlices).map((name) => [name, Object.freeze({ name })]),
);
features.columnFacetingFeature = Object.freeze({
  name: "columnFacetingFeature",
});
features.rowAggregationFeature = Object.freeze({
  name: "rowAggregationFeature",
});
function storeReactivityBindings() {
  return {
    createOptionsStore: true,
    wrapExternalAtoms: false,
    batch,
    schedule: queueMicrotask,
    untrack: (fn) => fn(),
    createWritableAtom: createAtom,
    createReadonlyAtom: createAtom,
  };
}
function tableFeatures(value = {}) {
  return { ...value };
}
function model(rows) {
  const result = empty();
  result.rows = rows;
  const visit = (rs) => {
    for (const row of rs) {
      result.flatRows.push(row);
      result.rowsById[row.id] = row;
      if (row.subRows.length) visit(row.subRows);
    }
  };
  visit(rows);
  return result;
}
function validate(options) {
  if (options.columns?.some((c) => c.columns?.length))
    throw new RangeError(
      "Nested source rows and nested column definitions are outside the flat DataTable contract",
    );
  if (
    options.enableColumnResizing ||
    options.features?.columnResizingFeature ||
    options.features?.cellSelectionFeature ||
    options.features?.cellSpanningFeature
  )
    throw new RangeError(
      "Interactive resizing, cell selection and cell spanning are outside the DataTable contract",
    );
}
function build(options, legacy) {
  validate(options);
  if (!Array.isArray(options.data) || !Array.isArray(options.columns))
    throw new TypeError("Table data and columns must be arrays");
  if (
    options.enableColumnResizing ||
    options.features?.columnResizingFeature ||
    options.features?.cellSelectionFeature ||
    options.features?.cellSpanningFeature
  )
    throw new RangeError(
      "Interactive resizing, cell selection and cell spanning are outside the DataTable contract",
    );
  const all = blank(),
    selected = legacy
      ? Object.keys(all)
      : [
          ...new Set(
            Object.entries(featureSlices)
              .filter(([key]) => options.features?.[key])
              .map(([, key]) => key),
          ),
        ];
  const initial = {
    ...Object.fromEntries(selected.map((k) => [k, structuredClone(all[k])])),
    ...options.initialState,
  };
  if (selected.includes("pagination"))
    initial.pagination = { ...all.pagination, ...initial.pagination };
  const binding =
    options.features?.coreReactivityFeature ?? storeReactivityBindings();
  const baseAtoms = Object.fromEntries(
    Object.entries(initial).map(([key, value]) => [
      key,
      binding.createWritableAtom(value, { debugName: key }),
    ]),
  );
  const optionsStore = binding.createWritableAtom(
    {
      renderFallbackValue: null,
      enableFilters: true,
      enableSorting: true,
      enableGrouping: true,
      enableRowSelection: true,
      enableMultiRowSelection: true,
      enableSubRowSelection: true,
      enableHiding: true,
      enableColumnPinning: true,
      keepPinnedRows: true,
      paginateExpandedRows: true,
      groupedColumnMode: "reorder",
      ...options,
    },
    { debugName: "options" },
  );
  const atoms = {};
  for (const key of Object.keys(initial))
    atoms[key] = binding.createReadonlyAtom(
      () => {
        const opts = optionsStore.get();
        return (
          options.atoms?.[key]?.get() ??
          (Object.hasOwn(opts.state ?? {}, key)
            ? (opts.state[key] ?? initial[key])
            : baseAtoms[key].get())
        );
      },
      { debugName: key },
    );
  const stateStore = binding.createReadonlyAtom(
    () =>
      Object.fromEntries(
        Object.entries(atoms).map(([key, value]) => [key, value.get()]),
      ),
    { compare: shallow, debugName: "state" },
  );
  const table = {
    initialState: initial,
    optionsStore,
    baseAtoms,
    atoms,
    _features: Object.values(options.features ?? {}),
    _queue: (fn) => queueMicrotask(fn),
  };
  Object.defineProperty(table, "options", {
    enumerable: true,
    get: () => optionsStore.get(),
    set: (value) => optionsStore.set(value),
  });
  table.store = {
    get: stateStore.get,
    subscribe: stateStore.subscribe,
    get state() {
      return stateStore.get();
    },
  };
  table.getState = () =>
    legacy ? (table.options.state ?? initial) : stateStore.get();
  table.setOptions = (updater) => {
    const next = functionalUpdate(updater, table.options);
    validate(next);
    table.options = next;
  };
  table.setState = (updater) => {
    if (legacy) {
      table.options.onStateChange?.(updater);
      return;
    }
    const next = functionalUpdate(updater, table.getState());
    batch(() => {
      for (const key of Object.keys(baseAtoms))
        if (Object.hasOwn(next, key)) writeSlice(key, next[key]);
    });
  };
  function writeSlice(key, updater) {
    const opts = table.options,
      callback = opts["on" + cap(key) + "Change"];
    if (callback) {
      callback(updater);
      return;
    }
    if (legacy) {
      table.setState((previous) => ({
        ...previous,
        [key]: functionalUpdate(updater, previous[key]),
      }));
      return;
    }
    const atom = options.atoms?.[key] ?? baseAtoms[key];
    if (atom) atom.set(updater);
  }
  for (const key of Object.keys(all)) {
    table["set" + cap(key)] = (updater) => writeSlice(key, updater);
    table["reset" + cap(key)] = (defaults = false) =>
      writeSlice(
        key,
        defaults
          ? structuredClone(all[key])
          : (initial[key] ?? structuredClone(all[key])),
      );
  }
  table.reset = () => table.setState(initial);
  const cache = new Map();
  function memo(key, deps, compute) {
    const old = cache.get(key);
    if (
      old &&
      deps.length === old.deps.length &&
      deps.every((v, i) => Object.is(v, old.deps[i]))
    )
      return old.value;
    const value = compute();
    cache.set(key, { deps, value });
    if (
      key === "core" ||
      key === "filtered:undefined" ||
      key === "grouped" ||
      key === "sorted"
    )
      table._autoResetPageIndex();
    if (key === "core" || key === "grouped") table._autoResetExpanded();
    return value;
  }
  function state(key) {
    return table.getState()?.[key] ?? all[key];
  }
  function enabled(name, row, fallback = true) {
    const value = table.options[name];
    return typeof value === "function" ? value(row) : (value ?? fallback);
  }
  function columns() {
    return memo(
      "columns",
      [table.options.columns, table.options.defaultColumn],
      () => {
        const ids = new Map();
        function make(def, index, parent) {
          const id = String(
            def.id ??
              (def.accessorKey != null
                ? String(def.accessorKey).replaceAll(".", "_")
                : typeof def.header === "string"
                  ? def.header
                  : ""),
          );
          if (!id)
            throw new Error(
              "A display/accessor-function column needs an id or string header",
            );
          if (ids.has(id)) throw new Error("Duplicate column id: " + id);
          const columnDef = {
            size: 150,
            minSize: 20,
            maxSize: Number.MAX_SAFE_INTEGER,
            ...table.options.defaultColumn,
            ...def,
          };
          const accessorFn =
            def.accessorFn ??
            (def.accessorKey != null
              ? (row) =>
                  String(def.accessorKey)
                    .split(".")
                    .reduce((value, key) => value?.[key], row)
              : undefined);
          const c = {
            id,
            index,
            depth: parent ? parent.depth + 1 : 0,
            parent,
            columnDef,
            accessorFn,
            columns: [],
          };
          ids.set(id, c);
          c.columns = (def.columns ?? []).map((child, i) => make(child, i, c));
          c.getFlatColumns = () => [
            c,
            ...c.columns.flatMap((x) => x.getFlatColumns()),
          ];
          c.getLeafColumns = () =>
            c.columns.length
              ? c.columns.flatMap((x) => x.getLeafColumns())
              : [c];
          c.getIsVisible = () =>
            c.columns.length
              ? c.columns.some((x) => x.getIsVisible())
              : state("columnVisibility")[id] !== false;
          c.getCanHide = () =>
            columnDef.enableHiding !== false && enabled("enableHiding");
          c.toggleVisibility = (value) => {
            if (c.getCanHide())
              writeSlice("columnVisibility", (old) => ({
                ...old,
                [id]: value ?? !c.getIsVisible(),
              }));
          };
          c.getToggleVisibilityHandler = () => (event) =>
            c.toggleVisibility(event?.target?.checked);
          c.getIndex = (position) => leafColumns(position).indexOf(c);
          c.getIsFirstColumn = (position) => leafColumns(position)[0] === c;
          c.getIsLastColumn = (position) => leafColumns(position).at(-1) === c;
          c.getCanPin = () =>
            columnDef.enablePinning !== false && enabled("enableColumnPinning");
          c.getIsPinned = () =>
            state("columnPinning").left?.includes(id)
              ? "left"
              : state("columnPinning").right?.includes(id)
                ? "right"
                : false;
          c.getPinnedIndex = () =>
            c.getIsPinned()
              ? state("columnPinning")[c.getIsPinned()].indexOf(id)
              : -1;
          c.pin = (position) =>
            writeSlice("columnPinning", (old) => {
              const moved = c.getLeafColumns().map((x) => x.id);
              const next = {
                left: (old.left ?? []).filter((x) => !moved.includes(x)),
                right: (old.right ?? []).filter((x) => !moved.includes(x)),
              };
              if (position) next[position].push(...moved);
              return next;
            });
          c.getSize = () =>
            Math.min(
              columnDef.maxSize,
              Math.max(
                columnDef.minSize,
                Object.hasOwn(state("columnSizing"), id)
                  ? state("columnSizing")[id]
                  : columnDef.size,
              ),
            );
          c.getStart = (position) =>
            leafColumns(position)
              .slice(0, c.getIndex(position))
              .reduce((sum, c) => sum + c.getSize(), 0);
          c.getAfter = (position) =>
            leafColumns(position)
              .slice(c.getIndex(position) + 1)
              .reduce((sum, c) => sum + c.getSize(), 0);
          c.getCanResize = () => false;
          c.getIsResizing = () => false;
          c.resetSize = () =>
            writeSlice("columnSizing", (old) =>
              Object.fromEntries(
                Object.entries(old).filter(([key]) => key !== id),
              ),
            );
          c.getCanFilter = () =>
            !!accessorFn &&
            columnDef.enableColumnFilter !== false &&
            enabled("enableColumnFilters") &&
            enabled("enableFilters");
          c.getCanGlobalFilter = () =>
            !!accessorFn &&
            columnDef.enableGlobalFilter !== false &&
            enabled("enableGlobalFilter") &&
            enabled("enableFilters") &&
            (table.options.getColumnCanGlobalFilter?.(c) ??
              ["string", "number"].includes(
                typeof table.getCoreRowModel().flatRows[0]?.getValue(id),
              ));
          c.getFilterIndex = () =>
            state("columnFilters").findIndex((x) => x.id === id);
          c.getFilterValue = () =>
            state("columnFilters").find((x) => x.id === id)?.value;
          c.getAutoFilterFn = () => {
            const value = table.getCoreRowModel().flatRows[0]?.getValue(id);
            return typeof value === "string"
              ? filterFns.includesString
              : typeof value === "number"
                ? filterFns.inNumberRange
                : Array.isArray(value)
                  ? filterFns.arrIncludes
                  : typeof value === "object" || typeof value === "boolean"
                    ? filterFns.equals
                    : filterFns.weakEquals;
          };
          c.getFilterFn = () =>
            typeof columnDef.filterFn === "function"
              ? columnDef.filterFn
              : columnDef.filterFn && columnDef.filterFn !== "auto"
                ? ((table.options.filterFns ??
                    table.options.features?.filterFns ??
                    {})[columnDef.filterFn] ?? filterFns[columnDef.filterFn])
                : c.getAutoFilterFn();
          c.setFilterValue = (updater) =>
            writeSlice("columnFilters", (old) => {
              const value = functionalUpdate(
                  updater,
                  old.find((x) => x.id === id)?.value,
                ),
                fn = c.getFilterFn(),
                rest = old.filter((x) => x.id !== id);
              return fn?.autoRemove?.(value, c) ||
                value === undefined ||
                value === ""
                ? rest
                : [...rest, { id, value }];
            });
          c.getCanSort = () =>
            !!accessorFn &&
            columnDef.enableSorting !== false &&
            enabled("enableSorting");
          c.getCanMultiSort = () =>
            c.getCanSort() &&
            columnDef.enableMultiSort !== false &&
            enabled("enableMultiSort");
          c.getAutoSortDir = () =>
            typeof table.getCoreRowModel().flatRows[0]?.getValue(id) ===
            "string"
              ? "asc"
              : "desc";
          c.getAutoSortingFn = c.getAutoSortFn = () => {
            const value = table.getCoreRowModel().flatRows[0]?.getValue(id);
            return value instanceof Date
              ? sortFns.datetime
              : typeof value === "string"
                ? /\d/.test(value)
                  ? sortFns.alphanumeric
                  : sortFns.text
                : sortFns.basic;
          };
          c.getSortingFn = c.getSortFn = () => {
            const value = columnDef.sortFn ?? columnDef.sortingFn;
            return typeof value === "function"
              ? value
              : value && value !== "auto"
                ? ((table.options.sortFns ??
                    table.options.sortingFns ??
                    table.options.features?.sortFns ??
                    {})[value] ?? sortFns[value])
                : c.getAutoSortFn();
          };
          c.getIsSorted = () => {
            const value = state("sorting").find((x) => x.id === id);
            return value ? (value.desc ? "desc" : "asc") : false;
          };
          c.getSortIndex = () => state("sorting").findIndex((x) => x.id === id);
          c.getFirstSortDir = () =>
            (columnDef.sortDescFirst ??
            table.options.sortDescFirst ??
            c.getAutoSortDir() === "desc")
              ? "desc"
              : "asc";
          c.getNextSortingOrder = () =>
            !c.getIsSorted()
              ? c.getFirstSortDir()
              : c.getIsSorted() !== c.getFirstSortDir() &&
                  enabled("enableSortingRemoval")
                ? false
                : c.getIsSorted() === "desc"
                  ? "asc"
                  : "desc";
          c.clearSorting = () =>
            writeSlice("sorting", (old) => old.filter((x) => x.id !== id));
          c.toggleSorting = (desc, multi = false) => {
            if (!c.getCanSort()) return;
            const order =
              desc === undefined
                ? c.getNextSortingOrder()
                : desc
                  ? "desc"
                  : "asc";
            writeSlice("sorting", (old) => {
              const next =
                multi && c.getCanMultiSort()
                  ? old.filter((x) => x.id !== id)
                  : [];
              if (order) next.push({ id, desc: order === "desc" });
              return next.slice(
                -(
                  table.options.maxMultiSortColCount ?? Number.MAX_SAFE_INTEGER
                ),
              );
            });
          };
          c.getToggleSortingHandler = () => (event) => {
            event?.persist?.();
            c.toggleSorting(
              undefined,
              table.options.isMultiSortEvent?.(event) ?? !!event?.shiftKey,
            );
          };
          c.getCanGroup = () =>
            !!(accessorFn || columnDef.getGroupingValue) &&
            columnDef.enableGrouping !== false &&
            enabled("enableGrouping");
          c.getIsGrouped = () => state("grouping").includes(id);
          c.getGroupedIndex = () => state("grouping").indexOf(id);
          c.toggleGrouping = () =>
            writeSlice("grouping", (old) =>
              old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
            );
          c.getToggleGroupingHandler = () => () => c.toggleGrouping();
          c.getAutoAggregationFn = () => {
            const value = table.getCoreRowModel().flatRows[0]?.getValue(id);
            return typeof value === "number"
              ? aggregationFns.sum
              : value instanceof Date
                ? aggregationFns.extent
                : undefined;
          };
          c.getAggregationFn = () =>
            typeof columnDef.aggregationFn === "function"
              ? columnDef.aggregationFn
              : ((table.options.aggregationFns ??
                  table.options.features?.aggregationFns ??
                  {})[columnDef.aggregationFn] ??
                aggregationFns[columnDef.aggregationFn] ??
                c.getAutoAggregationFn());
          c.getFacetedRowModel = () => filtered(id);
          c.getFacetedUniqueValues = () => facets(id, false);
          c.getFacetedMinMaxValues = () => facets(id, true);
          return c;
        }
        const roots = table.options.columns.map((def, i) => make(def, i));
        return { roots, ids };
      },
    );
  }
  function orderedLeaves() {
    return memo(
      "orderedLeaves",
      [
        columns(),
        state("columnOrder"),
        state("grouping"),
        table.options.groupedColumnMode,
      ],
      () => {
        const leaves = columns().roots.flatMap((c) => c.getLeafColumns()),
          order = state("columnOrder"),
          rank = new Map(order.map((id, i) => [id, i]));
        let result = leaves.toSorted(
          (a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity),
        );
        const grouping = state("grouping").filter((id) =>
          columns().ids.has(id),
        );
        if (grouping.length && table.options.groupedColumnMode)
          result =
            table.options.groupedColumnMode === "remove"
              ? result.filter((c) => !grouping.includes(c.id))
              : [
                  ...grouping.map((id) => columns().ids.get(id)),
                  ...result.filter((c) => !grouping.includes(c.id)),
                ];
        return result;
      },
    );
  }
  function leafColumns(position) {
    const leaves = orderedLeaves().filter((c) => c.getIsVisible()),
      pin = state("columnPinning");
    if (position === "left" || position === "right")
      return (pin[position] ?? [])
        .map((id) => leaves.find((c) => c.id === id))
        .filter(Boolean);
    if (position === "center")
      return leaves.filter(
        (c) =>
          !(pin.left ?? []).includes(c.id) && !(pin.right ?? []).includes(c.id),
      );
    return leaves;
  }
  table.getAllColumns = () => columns().roots;
  table.getAllFlatColumns = () =>
    columns().roots.flatMap((c) => c.getFlatColumns());
  table.getAllLeafColumns = orderedLeaves;
  table.getColumn = (id) => columns().ids.get(id);
  const pinnedLeaves = () => [
    ...leafColumns("left"),
    ...leafColumns("center"),
    ...leafColumns("right"),
  ];
  table.getVisibleLeafColumns = () => leafColumns();
  for (const position of ["Left", "Center", "Right"]) {
    table["get" + position + "VisibleLeafColumns"] = () =>
      leafColumns(position.toLowerCase());
    table["get" + position + "LeafColumns"] =
      table["get" + position + "VisibleLeafColumns"];
  }
  table.getVisibleFlatColumns = () =>
    table.getAllFlatColumns().filter((c) => c.getIsVisible());
  table.getIsAllColumnsVisible = () =>
    orderedLeaves().every((c) => c.getIsVisible());
  table.getIsSomeColumnsVisible = () =>
    orderedLeaves().some((c) => c.getIsVisible());
  table.toggleAllColumnsVisible = (value) =>
    writeSlice(
      "columnVisibility",
      Object.fromEntries(
        orderedLeaves().map((c) => [
          c.id,
          !c.getCanHide() || Boolean(value ?? !table.getIsAllColumnsVisible()),
        ]),
      ),
    );
  table.getToggleAllColumnsVisibilityHandler = () => (e) =>
    table.toggleAllColumnsVisible(e.target.checked);
  table.getIsSomeColumnsPinned = (position) =>
    position
      ? !!state("columnPinning")[position]?.length
      : !!(
          state("columnPinning").left?.length ||
          state("columnPinning").right?.length
        );
  function makeRow(original, index, id, depth = 0, parentId, children = []) {
    const values = Object.create(null),
      unique = Object.create(null),
      row = {
        id,
        index,
        original,
        depth,
        parentId,
        subRows: children,
        _valuesCache: values,
        _uniqueValuesCache: unique,
        columnFilters: Object.create(null),
        columnFiltersMeta: Object.create(null),
      };
    row.getValue = (columnId) => {
      if (Object.hasOwn(values, columnId)) return values[columnId];
      const column = table.getColumn(columnId);
      if (!column?.accessorFn) return undefined;
      return (values[columnId] = column.accessorFn(original, index));
    };
    row.renderValue = (columnId) =>
      row.getValue(columnId) ?? table.options.renderFallbackValue;
    row.getUniqueValues = (columnId) =>
      Object.hasOwn(unique, columnId)
        ? unique[columnId]
        : (unique[columnId] = table
            .getColumn(columnId)
            ?.columnDef.getUniqueValues?.(original, index) ?? [
            row.getValue(columnId),
          ]);
    row.getLeafRows = () =>
      row.subRows.flatMap((child) =>
        child.subRows.length ? child.getLeafRows() : [child],
      );
    row.getParentRow = () =>
      parentId ? table.getPreExpandedRowModel().rowsById[parentId] : undefined;
    row.getParentRows = () => {
      const parent = row.getParentRow();
      return parent ? [...parent.getParentRows(), parent] : [];
    };
    row.getGroupingValue = (id) =>
      table.getColumn(id)?.columnDef.getGroupingValue?.(original, index, row) ??
      row.getValue(id);
    row.getIsGrouped = () => !!row.groupingColumnId;
    row.getCanExpand = () =>
      table.options.getRowCanExpand?.(row) ??
      (enabled("enableExpanding") && row.subRows.length > 0);
    row.getIsExpanded = () =>
      table.options.getIsRowExpanded?.(row) ??
      (state("expanded") === true ||
        (Object.hasOwn(state("expanded"), id) && !!state("expanded")[id]));
    row.toggleExpanded = (value) =>
      writeSlice("expanded", (old) => {
        const next =
          old === true
            ? Object.fromEntries(
                table
                  .getPreExpandedRowModel()
                  .flatRows.map((r) => [r.id, true]),
              )
            : { ...old };
        if (value ?? !row.getIsExpanded())
          Object.defineProperty(next, id, {
            value: true,
            configurable: true,
            enumerable: true,
            writable: true,
          });
        else delete next[id];
        return next;
      });
    row.getToggleExpandedHandler = () => () => {
      if (row.getCanExpand()) row.toggleExpanded();
    };
    row.getIsAllParentsExpanded = () =>
      row.getParentRows().every((r) => r.getIsExpanded());
    row.getCanSelect = () => enabled("enableRowSelection", row);
    row.getCanMultiSelect = () => enabled("enableMultiRowSelection", row);
    row.getCanSelectSubRows = () => enabled("enableSubRowSelection", row);
    row.getIsSelected = () =>
      Object.hasOwn(state("rowSelection"), id) && !!state("rowSelection")[id];
    row.getIsSomeSelected = () => {
      const leaves = row.getLeafRows().filter((r) => r.getCanSelect());
      return (
        leaves.some((r) => r.getIsSelected()) &&
        !leaves.every((r) => r.getIsSelected())
      );
    };
    row.getIsAllSubRowsSelected = () =>
      row.subRows.length > 0 &&
      row
        .getLeafRows()
        .filter((r) => r.getCanSelect())
        .every((r) => r.getIsSelected());
    row.toggleSelected = (value, options = {}) =>
      writeSlice("rowSelection", (old) => {
        const next = { ...old },
          selected = value ?? !row.getIsSelected();
        updateSelectionTree(
          next,
          row,
          selected,
          options.selectChildren !== false &&
            (legacy || row.getCanMultiSelect()),
        );
        return next;
      });
    row.getToggleSelectedHandler = () => (e) =>
      row.toggleSelected(e.target.checked);
    row.getCanPin = () => enabled("enableRowPinning", row, false);
    row.getIsPinned = () =>
      state("rowPinning").top?.includes(id)
        ? "top"
        : state("rowPinning").bottom?.includes(id)
          ? "bottom"
          : false;
    row.getPinnedIndex = () =>
      row.getIsPinned()
        ? state("rowPinning")[row.getIsPinned()].indexOf(id)
        : -1;
    row.pin = (position, includeLeaf = false, includeParents = false) =>
      writeSlice("rowPinning", (old) => {
        const ids = [
            id,
            ...(includeLeaf ? row.getLeafRows().map((r) => r.id) : []),
            ...(includeParents ? row.getParentRows().map((r) => r.id) : []),
          ],
          next = {
            top: (old.top ?? []).filter((x) => !ids.includes(x)),
            bottom: (old.bottom ?? []).filter((x) => !ids.includes(x)),
          };
        if (position) next[position].push(...ids);
        return next;
      });
    const cells = new Map();
    function cell(column) {
      let cell = cells.get(column.id);
      if (cell) return cell;
      cell = {
        id: id + "_" + column.id,
        row,
        column,
        getValue: () => row.getValue(column.id),
        renderValue: () => row.renderValue(column.id),
        getIsGrouped: () => row.groupingColumnId === column.id,
        getIsPlaceholder: () =>
          state("grouping").includes(column.id) &&
          row.groupingColumnId !== column.id,
        getIsAggregated: () =>
          row.getIsGrouped() &&
          !state("grouping").includes(column.id) &&
          (legacy || !!column.getAggregationFn()),
      };
      cell.getContext = () => ({
        table,
        row,
        column,
        cell,
        getValue: cell.getValue,
        renderValue: cell.renderValue,
      });
      cells.set(column.id, cell);
      return cell;
    }
    row.getAllCells = () => orderedLeaves().map(cell);
    row.getVisibleCells = () => pinnedLeaves().map(cell);
    for (const position of ["Left", "Center", "Right"])
      row["get" + position + "VisibleCells"] = () =>
        leafColumns(position.toLowerCase()).map(cell);
    return row;
  }
  function withChildren(
    row,
    children,
    depth = row.depth,
    parentId = row.parentId,
  ) {
    const copy = makeRow(
      row.original,
      row.index,
      row.id,
      depth,
      parentId,
      children,
    );
    for (const key of [
      "getValue",
      "getUniqueValues",
      "groupingColumnId",
      "groupingValue",
      "leafRows",
      "columnFilters",
      "columnFiltersMeta",
    ])
      if (key in row) copy[key] = row[key];
    return copy;
  }
  // MRT recreates presentation column objects on each render. Only changes
  // affecting row values/pipelines invalidate the data model and reset paging.
  let rowSchema;
  function dataSchema() {
    return memo("data schema", [columns()], () => {
      const next = columns().roots.flatMap((c) => {
        const d = c.columnDef;
        return [
          c.id,
          d.accessorKey,
          d.accessorFn,
          d.getUniqueValues,
          d.getGroupingValue,
          d.filterFn,
          d.sortFn,
          d.sortingFn,
          d.aggregationFn,
          d.sortUndefined,
          d.invertSorting,
          d.enableSorting,
          d.enableColumnFilter,
          d.enableGlobalFilter,
          d.enableGrouping,
        ];
      });
      if (
        !rowSchema ||
        next.length !== rowSchema.length ||
        next.some((value, i) => !Object.is(value, rowSchema[i]))
      )
        rowSchema = next;
      return rowSchema;
    });
  }
  let previousInput;
  function rowInput() {
    return memo(
      "row input",
      [table.options.data, table.options.getRowId, table.options.getSubRows],
      () => {
        const data = table.options.data,
          ids = [],
          subRows = [],
          seen = new Set();
        for (let i = 0; i < data.length; i++) {
          const id = String(table.options.getRowId?.(data[i], i) ?? i);
          if (seen.has(id)) throw new Error("Duplicate row id: " + id);
          seen.add(id);
          const sub = table.options.getSubRows?.(data[i], i);
          if (sub?.length)
            throw new RangeError(
              "Nested source rows are outside the flat DataTable contract",
            );
          ids.push(id);
          subRows.push(sub);
        }
        // Fresh accessor wrappers with identical flat-row identities do not make
        // the dataset new. Still evaluate them to reject unsupported child data.
        if (
          previousInput?.data === data &&
          ids.length === previousInput.ids.length &&
          ids.every((id, i) => previousInput.ids[i] === id)
        )
          return previousInput;
        return (previousInput = { data, ids, subRows });
      },
    );
  }
  table.getCoreRowModel = () => {
    const input = rowInput();
    return memo("core", [input, dataSchema()], () =>
      model(
        input.data.map((original, index) => {
          const row = makeRow(original, index, input.ids[index], 0);
          row.originalSubRows = input.subRows[index];
          return row;
        }),
      ),
    );
  };
  table.getPreFilteredRowModel = table.getCoreRowModel;
  function filtered(exclude) {
    const core = table.getCoreRowModel();
    if (
      table.options.manualFiltering ||
      (!legacy && !table.options.features?.filteredRowModel) ||
      (legacy && !table.options.getFilteredRowModel)
    )
      return core;
    return memo(
      "filtered:" + exclude,
      [
        core,
        state("columnFilters"),
        state("globalFilter"),
        table.options.globalFilterFn,
        table.options.filterFns,
        table.options.features?.filterFns,
      ],
      () => {
        const filters = state("columnFilters")
          .filter((x) => x.id !== exclude)
          .map((x) => {
            const c = table.getColumn(x.id),
              fn = c?.getFilterFn();
            return fn
              ? {
                  ...x,
                  fn,
                  value: fn.resolveFilterValue?.(x.value, c) ?? x.value,
                }
              : null;
          })
          .filter(Boolean);
        const global = state("globalFilter"),
          gcols = global
            ? orderedLeaves().filter((c) => c.getCanGlobalFilter())
            : [],
          gfn = table.getGlobalFilterFn();
        if (!filters.length && !global) return core;
        function visit(rows) {
          const result = [];
          for (const row of rows) {
            let pass = true;
            for (const x of filters) {
              const ok = !!x.fn(row, x.id, x.value, (meta) => {
                row.columnFiltersMeta[x.id] = meta;
              });
              row.columnFilters[x.id] = ok;
              if (!ok) pass = false;
            }
            if (global && gcols.length && exclude !== "__global__") {
              const ok = gcols.some((c) =>
                gfn(row, c.id, global, (meta) => {
                  row.columnFiltersMeta[c.id] = meta;
                }),
              );
              row.columnFilters.__global__ = ok;
              if (!ok) pass = false;
            }
            if (pass) {
              if (row.subRows.length) {
                const copy = withChildren(row, visit(row.subRows));
                result.push(copy);
              } else result.push(row);
            }
          }
          return result;
        }
        return model(visit(core.rows));
      },
    );
  }
  table.getFilteredRowModel = () => filtered();
  table.getGlobalAutoFilterFn = () => filterFns.includesString;
  table.getGlobalFilterFn = () =>
    typeof table.options.globalFilterFn === "function"
      ? table.options.globalFilterFn
      : ((table.options.filterFns ?? table.options.features?.filterFns ?? {})[
          table.options.globalFilterFn
        ] ??
        filterFns[table.options.globalFilterFn] ??
        filterFns.includesString);
  function facets(id, range) {
    const source = filtered(id);
    return memo("facet:" + id + ":" + range, [source], () => {
      const counts = new Map();
      for (const row of source.flatRows)
        for (const value of row.getUniqueValues(id))
          counts.set(value, (counts.get(value) ?? 0) + 1);
      if (!range) return counts;
      const values = [...counts.keys()]
        .filter((v) => v != null)
        .map(Number)
        .filter((v) => !Number.isNaN(v));
      return values.length
        ? values.reduce(
            ([min, max], value) => [Math.min(min, value), Math.max(max, value)],
            [Infinity, -Infinity],
          )
        : undefined;
    });
  }
  table.getGlobalFacetedRowModel = () => filtered("__global__");
  table.getGlobalFacetedUniqueValues = () => new Map();
  table.getGlobalFacetedMinMaxValues = () => undefined;
  table.getPreGroupedRowModel = table.getFilteredRowModel;
  table.getGroupedRowModel = () => {
    const source = table.getPreGroupedRowModel(),
      grouping = state("grouping").filter((id) => table.getColumn(id));
    if (
      table.options.manualGrouping ||
      !grouping.length ||
      (!legacy && !table.options.features?.groupedRowModel) ||
      (legacy && !table.options.getGroupedRowModel)
    )
      return source;
    return memo(
      "grouped",
      [
        source,
        state("grouping"),
        table.options.aggregationFns,
        table.options.features?.aggregationFns,
      ],
      () => {
        function group(rows, level, parentId) {
          if (level === grouping.length)
            return rows.map((row) =>
              withChildren(row, row.subRows, level, parentId),
            );
          const columnId = grouping[level],
            buckets = new Map();
          for (const row of rows) {
            const key = String(row.getGroupingValue(columnId));
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(row);
          }
          return [...buckets].map(([key, leaves], index) => {
            const id = (parentId ? parentId + ">" : "") + columnId + ":" + key,
              children = group(leaves, level + 1, id),
              row = makeRow(
                leaves[0].original,
                index,
                id,
                level,
                parentId,
                children,
              ),
              aggregate = Object.create(null);
            row.groupingColumnId = columnId;
            row.groupingValue = leaves[0].getGroupingValue(columnId);
            row.leafRows = leaves;
            row.getValue = (id) => {
              if (grouping.includes(id)) return leaves[0].getValue(id);
              if (Object.hasOwn(aggregate, id)) return aggregate[id];
              const fn = table.getColumn(id)?.getAggregationFn();
              return (aggregate[id] = fn?.(id, leaves, children));
            };
            return row;
          });
        }
        return model(group(source.rows, 0));
      },
    );
  };
  table.getPreSortedRowModel = table.getGroupedRowModel;
  table.getSortedRowModel = () => {
    const source = table.getPreSortedRowModel(),
      sorting = state("sorting");
    if (
      table.options.manualSorting ||
      !sorting.length ||
      (!legacy && !table.options.features?.sortedRowModel) ||
      (legacy && !table.options.getSortedRowModel)
    )
      return source;
    return memo(
      "sorted",
      [
        source,
        state("sorting"),
        table.options.sortFns,
        table.options.sortingFns,
        table.options.features?.sortFns,
      ],
      () => {
        const rules = sorting.flatMap((rule) => {
          const c = table.getColumn(rule.id);
          return c?.getCanSort()
            ? [
                {
                  ...rule,
                  fn: c.getSortFn(),
                  undef: c.columnDef.sortUndefined ?? 1,
                  direction:
                    (rule.desc ? -1 : 1) * (c.columnDef.invertSorting ? -1 : 1),
                },
              ]
            : [];
        });
        const flatRows = [];
        function sort(rows) {
          const result = rows.toSorted((a, b) => {
            for (const rule of rules) {
              const av = a.getValue(rule.id),
                bv = b.getValue(rule.id),
                undef = rule.undef;
              let result = 0;
              if ((av === undefined || bv === undefined) && undef !== false) {
                if (av === undefined && bv === undefined) {
                  // Explicit placement keeps absent values stable. Otherwise a
                  // custom comparator may order rows using their original data.
                  if (undef === "first" || undef === "last") continue;
                } else {
                  if (undef === "first" || undef === "last")
                    return (
                      (av === undefined ? -1 : 1) * (undef === "last" ? -1 : 1)
                    );
                  result = (av === undefined ? 1 : -1) * undef;
                }
              }
              if (!result) result = rule.fn(a, b, rule.id);
              if (result) return result * rule.direction;
            }
            return a.index - b.index;
          });
          for (let i = 0; i < result.length; i++) {
            const row = result[i];
            const index = flatRows.length;
            flatRows.push(row);
            if (row.subRows.length)
              result[i] = flatRows[index] = withChildren(
                row,
                sort(row.subRows),
              );
          }
          return result;
        }
        return { rows: sort(source.rows), flatRows, rowsById: source.rowsById };
      },
    );
  };
  table.getPreExpandedRowModel = table.getSortedRowModel;
  table.getExpandedRowModel = () => {
    const source = table.getPreExpandedRowModel();
    if (
      table.options.manualExpanding ||
      !table.options.paginateExpandedRows ||
      (!legacy && !table.options.features?.expandedRowModel) ||
      (legacy && !table.options.getExpandedRowModel)
    )
      return source;
    return memo("expanded", [source, state("expanded")], () => {
      if (state("expanded") !== true && !Object.keys(state("expanded")).length)
        return source;
      const rows = [];
      function visit(rs) {
        for (const row of rs) {
          rows.push(row);
          if (row.subRows.length && row.getIsExpanded()) visit(row.subRows);
        }
      }
      visit(source.rows);
      return { ...source, rows };
    });
  };
  table.toggleAllRowsExpanded = (value) =>
    writeSlice(
      "expanded",
      (value ?? !table.getIsAllRowsExpanded()) ? true : {},
    );
  table.getIsSomeRowsExpanded = () =>
    state("expanded") === true ||
    Object.values(state("expanded")).some(Boolean);
  table.getIsAllRowsExpanded = () =>
    state("expanded") === true ||
    (table
      .getPreExpandedRowModel()
      .flatRows.filter((r) => r.getCanExpand())
      .every((r) => r.getIsExpanded()) &&
      table.getIsSomeRowsExpanded());
  table.getCanSomeRowsExpand = () =>
    table.getPreExpandedRowModel().flatRows.some((r) => r.getCanExpand());
  table.getToggleAllRowsExpandedHandler = () => () =>
    table.toggleAllRowsExpanded();
  table.getExpandedDepth = () =>
    Math.max(
      0,
      ...table
        .getPreExpandedRowModel()
        .flatRows.filter((r) => r.getIsExpanded())
        .map((r) => r.id.split(".").length),
    );
  table.getPrePaginationRowModel = table.getExpandedRowModel;
  table.getPaginationRowModel = () => {
    const source = table.getPrePaginationRowModel();
    if (
      table.options.manualPagination ||
      (!legacy && !table.options.features?.paginatedRowModel) ||
      (legacy && !table.options.getPaginationRowModel)
    )
      return source;
    const { pageIndex, pageSize } = state("pagination");
    return memo(
      "paginated",
      [
        source,
        pageIndex,
        pageSize,
        state("expanded"),
        table.options.paginateExpandedRows,
      ],
      () => {
        let rows = source.rows.slice(
          pageIndex * pageSize,
          (pageIndex + 1) * pageSize,
        );
        if (!table.options.paginateExpandedRows) {
          const out = [];
          const visit = (rs) => {
            for (const row of rs) {
              out.push(row);
              if (row.getIsExpanded()) visit(row.subRows);
            }
          };
          visit(rows);
          rows = out;
        }
        return { ...source, rows, flatRows: model(rows).flatRows };
      },
    );
  };
  let lastOptions, lastState, lastModel;
  table.getRowModel = () => {
    const opts = table.options,
      current = table.getState();
    if (lastModel && opts === lastOptions && current === lastState)
      return lastModel;
    const result = table.getPaginationRowModel();
    lastOptions = opts;
    lastState = current;
    lastModel = result;
    return result;
  };
  table.getRow = (id, searchAll = false) => {
    const row =
      (searchAll ? table.getPrePaginationRowModel() : table.getRowModel())
        .rowsById[id] ?? table.getCoreRowModel().rowsById[id];
    if (!row) throw new Error("Unknown row id: " + id);
    return row;
  };
  table.getRowCount = () =>
    table.options.rowCount ?? table.getPrePaginationRowModel().rows.length;
  table.getPageCount = () =>
    table.options.pageCount ??
    Math.ceil(table.getRowCount() / state("pagination").pageSize);
  table.getPageOptions = () =>
    Array.from({ length: Math.max(0, table.getPageCount()) }, (_, i) => i);
  table.getCanPreviousPage = () => state("pagination").pageIndex > 0;
  table.getCanNextPage = () =>
    table.getPageCount() === -1 ||
    state("pagination").pageIndex < table.getPageCount() - 1;
  table.setPageIndex = (updater) =>
    writeSlice("pagination", (old) => ({
      ...old,
      pageIndex: Math.max(
        0,
        Math.min(
          functionalUpdate(
            updater,
            old.pageIndex ?? initial.pagination?.pageIndex ?? 0,
          ),
          table.options.pageCount != null && table.options.pageCount !== -1
            ? table.options.pageCount - 1
            : Number.MAX_SAFE_INTEGER,
        ),
      ),
    }));
  table.setPageSize = (updater) =>
    writeSlice("pagination", (old) => {
      const pageSize = Math.max(1, functionalUpdate(updater, old.pageSize));
      return {
        ...old,
        pageSize,
        pageIndex: Math.floor(
          ((old.pageSize ?? initial.pagination?.pageSize ?? 10) *
            (old.pageIndex ?? initial.pagination?.pageIndex ?? 0)) /
            pageSize,
        ),
      };
    });
  table.resetPageIndex = (defaults = false) =>
    table.setPageIndex(defaults ? 0 : (initial.pagination?.pageIndex ?? 0));
  table.resetPageSize = (defaults = false) =>
    table.setPageSize(defaults ? 10 : (initial.pagination?.pageSize ?? 10));
  table.previousPage = () => table.setPageIndex((i) => i - 1);
  table.nextPage = () => table.setPageIndex((i) => i + 1);
  table.firstPage = () => table.setPageIndex(0);
  table.lastPage = () => table.setPageIndex(table.getPageCount() - 1);
  for (const [name, option, manual, reset] of [
    ["PageIndex", "autoResetPageIndex", "manualPagination", "resetPageIndex"],
    ["Expanded", "autoResetExpanded", "manualExpanding", "resetExpanded"],
  ]) {
    let registered = false,
      registering = false,
      queued = false;
    table["_autoReset" + name] = () => {
      if (!registered) {
        if (!registering) {
          registering = true;
          queueMicrotask(() => {
            registered = true;
          });
        }
        return;
      }
      if (
        !(
          table.options.autoResetAll ??
          table.options[option] ??
          !table.options[manual]
        ) ||
        queued
      )
        return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        table[reset]();
      });
    };
  }
  function selection(source) {
    const input = table[source]();
    return memo("selected:" + source, [input, state("rowSelection")], () => {
      const result = empty();
      function visit(rows) {
        const selected = [];
        for (const row of rows) {
          if (row.getIsSelected()) {
            result.flatRows.push(row);
            result.rowsById[row.id] = row;
          }
          const children = visit(row.subRows);
          if (row.getIsSelected())
            selected.push(
              row.subRows.length ? withChildren(row, children) : row,
            );
        }
        return selected;
      }
      result.rows = visit(input.rows);
      return result;
    });
  }
  table.getPreSelectedRowModel = table.getCoreRowModel;
  table.getSelectedRowModel = () => selection("getCoreRowModel");
  table.getFilteredSelectedRowModel = () => selection("getFilteredRowModel");
  table.getGroupedSelectedRowModel = () => selection("getSortedRowModel");
  function updateSelectionTree(next, row, checked, includeChildren) {
    if (checked) {
      if (!row.getCanMultiSelect())
        for (const id of Object.keys(next)) delete next[id];
      if (row.getCanSelect())
        Object.defineProperty(next, row.id, {
          value: true,
          configurable: true,
          enumerable: true,
          writable: true,
        });
    } else delete next[row.id];
    // A collapsed group owns selectable descendants even though they are not
    // rendered. Respect its sub-row policy before visiting that subtree.
    if (includeChildren && row.getCanSelectSubRows())
      for (const child of row.subRows)
        updateSelectionTree(next, child, checked, true);
  }
  const selectable = (page) => {
    if (!page)
      return table
        .getFilteredRowModel()
        .flatRows.filter((r) => r.getCanSelect());
    if (legacy)
      return table.getRowModel().flatRows.filter((r) => r.getCanSelect());
    const rows = [];
    const visit = (row) => {
      if (row.getCanSelect()) rows.push(row);
      else for (const child of row.subRows) visit(child);
    };
    for (const row of table.getRowModel().rows) visit(row);
    return rows;
  };
  table.getIsAllRowsSelected = () =>
    selectable(false).length > 0 &&
    selectable(false).every((r) => r.getIsSelected());
  table.getIsSomeRowsSelected = () =>
    selectable(false).some((r) => r.getIsSelected()) &&
    !table.getIsAllRowsSelected();
  table.getIsAllPageRowsSelected = () =>
    selectable(true).length > 0 &&
    selectable(true).every((r) => r.getIsSelected());
  table.getIsSomePageRowsSelected = () =>
    selectable(true).some((r) => r.getIsSelected() || r.getIsSomeSelected()) &&
    (!legacy || !table.getIsAllPageRowsSelected());
  for (const page of [false, true]) {
    const key = page ? "PageRows" : "Rows";
    table["toggleAll" + key + "Selected"] = (value) =>
      writeSlice("rowSelection", (old) => {
        const next = { ...old },
          checked = value ?? !table["getIsAll" + key + "Selected"]();
        if (page) {
          for (const row of table.getRowModel().rows)
            updateSelectionTree(next, row, checked, true);
        } else {
          for (const row of selectable(false)) {
            if (checked)
              Object.defineProperty(next, row.id, {
                value: true,
                configurable: true,
                enumerable: true,
                writable: true,
              });
            else delete next[row.id];
          }
        }
        return next;
      });
    table["getToggleAll" + key + "SelectedHandler"] = () => (e) =>
      table["toggleAll" + key + "Selected"](e.target.checked);
  }
  for (const position of ["top", "bottom"])
    table["get" + cap(position) + "Rows"] = () =>
      (state("rowPinning")[position] ?? [])
        .map((id) =>
          table.options.keepPinnedRows
            ? table.getCoreRowModel().rowsById[id]
            : table.getRowModel().rows.find((r) => r.id === id),
        )
        .filter(Boolean);
  table.getCenterRows = () =>
    table.getRowModel().rows.filter((r) => !r.getIsPinned());
  table.getIsSomeRowsPinned = (position) =>
    position
      ? !!state("rowPinning")[position]?.length
      : !!(
          state("rowPinning").top?.length || state("rowPinning").bottom?.length
        );
  function headers(position) {
    const leaves = position
      ? leafColumns(position)
      : legacy
        ? pinnedLeaves()
        : leafColumns();
    return memo(
      "headers:" + position,
      [
        columns(),
        state("columnVisibility"),
        state("columnOrder"),
        state("columnPinning"),
        state("grouping"),
      ],
      () => {
        if (leaves.some((c) => c.depth > 0))
          throw new RangeError(
            "Nested column header definitions are outside the current flat DataTable contract",
          );
        const group = { id: position ?? "0", depth: 0, headers: [] };
        group.headers = leaves.map((column, index) => {
          const header = {
            id: column.id,
            column,
            index,
            depth: 1,
            isPlaceholder: false,
            placeholderId: undefined,
            subHeaders: [],
            colSpan: 1,
            rowSpan: 0,
            headerGroup: group,
            getSize: column.getSize,
            getStart: () =>
              leaves.slice(0, index).reduce((n, c) => n + c.getSize(), 0),
            getResizeHandler: () => () => {
              throw new RangeError("Interactive resizing is not implemented");
            },
            getLeafHeaders: () => [header],
          };
          header.getContext = () => ({ table, column, header });
          return header;
        });
        return [group];
      },
    );
  }
  table.getHeaderGroups = () => headers();
  table.getFooterGroups = () => headers().toReversed();
  table.getFlatHeaders = () => headers().flatMap((g) => g.headers);
  table.getLeafHeaders = table.getFlatHeaders;
  for (const position of ["Left", "Center", "Right"]) {
    table["get" + position + "HeaderGroups"] = () =>
      headers(position.toLowerCase());
    table["get" + position + "FooterGroups"] = () =>
      headers(position.toLowerCase()).toReversed();
    table["get" + position + "FlatHeaders"] = () =>
      headers(position.toLowerCase()).flatMap((g) => g.headers);
    table["get" + position + "LeafHeaders"] =
      table["get" + position + "FlatHeaders"];
    table["get" + position + "TotalSize"] = () =>
      leafColumns(position.toLowerCase()).reduce(
        (sum, c) => sum + c.getSize(),
        0,
      );
  }
  table.getTotalSize = () =>
    leafColumns().reduce((sum, c) => sum + c.getSize(), 0);
  return table;
}
const api = {
  ...f,
  ...features,
  tableFeatures,
  stockFeatures: () => ({ ...features }),
  constructTable: (options) => build(options, false),
  createTable: (options) => build(options, true),
  storeReactivityBindings,
  makeStateUpdater: (key, table) => (updater) =>
    table.setState((old) => ({
      ...old,
      [key]: functionalUpdate(updater, old[key]),
    })),
  flattenBy: (rows, getChildren) => {
    const out = [];
    const visit = (rs) => {
      for (const row of rs) {
        out.push(row);
        const children = getChildren(row);
        if (children?.length) visit(children);
      }
    };
    visit(rows);
    return out;
  },
};
for (const [name, method] of Object.entries({
  Core: "getCoreRowModel",
  Filtered: "getFilteredRowModel",
  Grouped: "getGroupedRowModel",
  Sorted: "getSortedRowModel",
  Expanded: "getExpandedRowModel",
  Pagination: "getPaginationRowModel",
  Faceted: "getFacetedRowModel",
  FacetedUniqueValues: "getFacetedUniqueValues",
  FacetedMinMaxValues: "getFacetedMinMaxValues",
})) {
  const suffix =
    name.startsWith("Faceted") && name !== "Faceted" ? "" : "RowModel";
  api["get" + name + suffix] = () => (table, columnId) => () =>
    columnId && columnId !== "__global__"
      ? table.getColumn(columnId)[method]()
      : table[method.replace("getFaceted", "getGlobalFaceted")]();
  api["create" + (name === "Pagination" ? "Paginated" : name) + suffix] =
    api["get" + name + suffix];
}
module.exports = api;
