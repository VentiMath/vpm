"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path"),
  { createRequire } = require("node:module");
const { peer, load, candidate: loadCandidate } = require("./load.cjs"),
  React = peer("react"),
  { renderToString } = peer("react-dom/server");
const candidate = loadCandidate(),
  app = load(path.join(__dirname, "node_modules/.vpm-react-table/ssr-app.cjs")),
  current = load(
    path.join(__dirname, "node_modules/.vpm-react-table/ssr-current.cjs"),
  ),
  legacy = current;
const rows = [
    { id: "1", topic: "Geometry", points: 9 },
    { id: "2", topic: "Algebra", points: 3 },
    { id: "3", topic: "Counting", points: 6 },
  ],
  h = React.createElement;
function render(api, mode) {
  function View() {
    const features = api.tableFeatures?.({
      rowSortingFeature: api.rowSortingFeature,
      sortedRowModel: api.createSortedRowModel?.(),
      sortFns: { basic: api.sortFn_basic },
      rowSelectionFeature: api.rowSelectionFeature,
    });
    const hook = api[mode];
    const t = hook({
      data: rows,
      columns: [
        { accessorKey: "topic", header: "Topic" },
        {
          accessorKey: "points",
          header: "Points",
          sortingFn: "basic",
          sortFn: "basic",
          cell: ({ getValue }) => h("b", null, getValue()),
        },
      ],
      features: mode === "useTable" ? features : undefined,
      getCoreRowModel: api.getCoreRowModel?.(),
      getSortedRowModel: api.getSortedRowModel?.(),
      initialState: {
        sorting: [{ id: "points", desc: false }],
        rowSelection: { 2: true },
      },
      getRowId: (r) => r.id,
    });
    return h(
      "table",
      null,
      h(
        "thead",
        null,
        t.getHeaderGroups().map((g) =>
          h(
            "tr",
            { key: g.id },
            g.headers.map((header) =>
              h(
                "th",
                { key: header.id },
                api.flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                ),
              ),
            ),
          ),
        ),
      ),
      h(
        "tbody",
        null,
        t.getRowModel().rows.map((row) =>
          h(
            "tr",
            { key: row.id, "data-selected": row.getIsSelected() },
            row
              .getAllCells()
              .map((cell) =>
                h(
                  "td",
                  { key: cell.id },
                  cell.column.columnDef.cell
                    ? api.flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )
                    : cell.getValue(),
                ),
              ),
          ),
        ),
      ),
    );
  }
  return renderToString(h(View));
}
const controls = {
  useTable: current,
  useReactTable: app,
  useLegacyTable: { ...current, ...legacy },
};
for (const mode of Object.keys(controls)) {
  assert.equal(render(candidate, mode), render(controls[mode], mode), mode);
}
assert.throws(() => candidate.FlexRender({}), /exactly one/);
assert.throws(
  () => candidate.FlexRender({ cell: {}, header: {} }),
  /exactly one/,
);
assert.equal(candidate.flexRender(0, {}), 0);
console.log(
  "Node/Bun SSR: current, Table8 and legacy output match; rendering input checks pass.",
);
module.exports = { render };
