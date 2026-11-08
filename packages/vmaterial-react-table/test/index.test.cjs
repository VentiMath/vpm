const test = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const {
  load,
  peer,
  fixture,
} = require("../../../scripts/material-table-conformance/load.cjs");
const api = load(
  path.join(fixture, "node_modules/.vpm-material-table/ssr-vpm.cjs"),
);
const React = peer("react"),
  render = peer("react-dom/server").renderToString;
const draw = (o) =>
  render(
    React.createElement(api.MaterialReactTable, {
      data: [
        { id: "a", name: "<img onerror=bad()>" },
        { id: "b", name: "Algebra" },
      ],
      columns: [{ accessorKey: "name", header: "Name" }],
      ...o,
    }),
  );
test("React cells can use hooks and values stay escaped", () => {
  function Cell({ row }) {
    return React.createElement(
      "output",
      { id: React.useId() },
      row.original.name,
    );
  }
  const html = draw({
    columns: [{ accessorKey: "name", header: "Name", Cell }],
  });
  assert.match(html, /&lt;img onerror=bad\(\)&gt;/);
  assert.doesNotMatch(html, /<img onerror/);
  assert.match(html, /<output/);
});
test("page-size-only initialization renders the first page", () => {
  const html = draw({ initialState: { pagination: { pageSize: 1 } } });
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, />Algebra</);
});
test("pagination can be disabled for full data", () => {
  const html = draw({
    enablePagination: false,
    initialState: { pagination: { pageIndex: 0, pageSize: 1 } },
  });
  assert.match(html, />Algebra</);
});
test("fuzzy metadata and empty filters preserve matching semantics", () => {
  const row = { getValue: () => "Algebra" },
    meta = [];
  assert.equal(
    api.MRT_FilterFns.fuzzy(row, "name", "algbra", (m) => meta.push(m)),
    true,
  );
  assert.equal(meta.length, 1);
  assert.equal(api.MRT_FilterFns.contains(row, "name", "GEB"), true);
  assert.equal(api.MRT_FilterFns.equals(row, "name", "Geometry"), false);
  assert.equal(api.MRT_FilterFns.arrIncludesSome(row, "name", []), true);
});
test("unsupported rendering features fail explicitly", () => {
  for (const flag of [
    "enableEditing",
    "enableColumnResizing",
    "enableRowOrdering",
    "enableRowVirtualization",
  ])
    assert.throws(() => draw({ [flag]: true }), /outside/);
});
