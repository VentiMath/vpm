"use strict";
const data = Array.from({ length: 48 }, (_, i) => ({
  id: "p" + i,
  name: ["Algebra", "Geometry", "Calculus"][i % 3] + " " + (i % 7),
  category: ["Book", "Course"][i % 2],
  price: (i * 13) % 91,
  active: i % 3 !== 0,
  tags: i % 2 ? ["math", "new"] : ["math"],
}));
function create(api, current = false, extra = {}) {
  const columns = [
    {
      accessorKey: "name",
      filterFn: "includesString",
      sortingFn: "alphanumeric",
      sortFn: "alphanumeric",
    },
    { accessorKey: "category", filterFn: "equalsString" },
    {
      accessorKey: "price",
      filterFn: "inNumberRange",
      sortingFn: "basic",
      sortFn: "basic",
    },
    { accessorKey: "active" },
    { accessorKey: "tags", filterFn: "arrIncludes" },
    { id: "actions", header: "Actions" },
  ];
  const options = {
    data,
    columns,
    getRowId: (r) => r.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 15 } },
    autoResetPageIndex: false,
    ...extra,
  };
  if (current) {
    const features = {
      coreReactivityFeature: (
        api.storeReactivityBindings ??
        require("@tanstack/table-core/store-reactivity-bindings")
          .storeReactivityBindings
      )(),
    };
    for (const name of [
      "columnVisibility",
      "columnOrdering",
      "columnPinning",
      "columnFiltering",
      "globalFiltering",
      "columnGrouping",
      "rowSorting",
      "rowExpanding",
      "rowPagination",
      "rowSelection",
      "rowPinning",
      "columnSizing",
      "rowAggregation",
      "columnFaceting",
    ])
      if (api[name + "Feature"])
        features[name + "Feature"] = api[name + "Feature"];
    for (const name of [
      "Core",
      "Filtered",
      "Sorted",
      "Grouped",
      "Expanded",
      "Paginated",
      "Faceted",
      "FacetedUniqueValues",
      "FacetedMinMaxValues",
    ]) {
      const suffix =
        name.startsWith("Faceted") && name !== "Faceted" ? "" : "RowModel";
      const fn = api["create" + name + suffix];
      if (fn) features[name[0].toLowerCase() + name.slice(1) + suffix] = fn();
    }
    features.sortFns = api.sortFns ?? {
      alphanumeric: api.sortFn_alphanumeric,
      basic: api.sortFn_basic,
    };
    features.filterFns = api.filterFns ?? {
      includesString: api.filterFn_includesString,
      equalsString: api.filterFn_equalsString,
      inNumberRange: api.filterFn_inNumberRange,
      arrIncludes: api.filterFn_arrIncludes,
    };
    features.aggregationFns = api.aggregationFns ?? {
      sum: api.aggregationFn_sum,
    };
    const t = api.constructTable({
      ...options,
      features: api.tableFeatures(features),
    });
    return t;
  }
  const factories = Object.fromEntries(
    [
      "CoreRowModel",
      "FilteredRowModel",
      "SortedRowModel",
      "GroupedRowModel",
      "ExpandedRowModel",
      "PaginationRowModel",
      "FacetedRowModel",
      "FacetedUniqueValues",
      "FacetedMinMaxValues",
    ].map((n) => ["get" + n, api["get" + n]()]),
  );
  const t = api.createTable({
    ...factories,
    ...options,
    state: {},
    onStateChange: (u) =>
      t.setOptions((o) => ({
        ...o,
        state: typeof u === "function" ? u(o.state) : u,
      })),
  });
  t.setOptions((o) => ({ ...o, state: { ...t.initialState } }));
  return t;
}
const ids = (model) => model.rows.map((r) => r.id);
function snapshot(t, label) {
  return {
    label,
    rows: ids(t.getRowModel()),
    filtered: ids(t.getFilteredRowModel()),
    selected: ids(t.getSelectedRowModel()),
    visible: t.getVisibleLeafColumns().map((c) => c.id),
    headers: t
      .getHeaderGroups()
      .map((g) => g.headers.map((h) => ({ id: h.id, colSpan: h.colSpan }))),
    pageCount: t.getPageCount(),
    values: t
      .getRowModel()
      .rows.slice(0, 3)
      .map((r) => [r.getValue("name"), r.getValue("price")]),
    facets: [...t.getColumn("category").getFacetedUniqueValues()],
    range: t.getColumn("price").getFacetedMinMaxValues(),
  };
}
function run(api, current) {
  const t = create(api, current),
    out = [];
  const take = (label) => out.push(snapshot(t, label));
  take("initial");
  t.getColumn("price").toggleSorting(false);
  take("sort");
  t.nextPage();
  take("page");
  t.setPageSize(7);
  take("resize page");
  t.getColumn("name").setFilterValue("algebra");
  t.firstPage();
  take("column filter");
  t.setGlobalFilter("book");
  take("global filter");
  t.setGlobalFilter(undefined);
  t.getColumn("price").setFilterValue([20, 70]);
  take("range");
  t.toggleAllPageRowsSelected(true);
  take("page selection");
  t.resetRowSelection();
  t.getRow("p3", true).toggleSelected();
  take("single select");
  t.getColumn("active").toggleVisibility(false);
  t.getColumn("actions").pin("left");
  t.setColumnOrder(["price", "name"]);
  take("columns");
  t.resetColumnFilters();
  t.setGrouping(["category"]);
  t.setExpanded(true);
  t.firstPage();
  take("groups");
  t.setGrouping([]);
  t.setExpanded({});
  t.setOptions((o) => ({ ...o, data: data.slice(0, 6) }));
  take("replace data");
  return out;
}
module.exports = { data, create, snapshot, run };
