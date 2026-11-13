"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module");
const fixture = path.resolve(__dirname, "../react-table-conformance"),
  peer = createRequire(
    path.join(process.env.VPM_MATERIAL_CONSUMER || fixture, "package.json"),
  );
const React = peer("react"),
  render = peer("react-dom/server").renderToString;
const control = require("./load.cjs").load(
  path.join(fixture, "node_modules/.vpm-material-table/ssr-app.cjs"),
);
const candidate = require("./load.cjs").load(
  path.join(fixture, "node_modules/.vpm-material-table/ssr-vpm.cjs"),
);
function run(api, options = {}) {
  return render(
    React.createElement(api.MaterialReactTable, {
      data: [
        { id: "a", name: "<Algebra>", score: 2 },
        { id: "b", name: "Geometry", score: 1 },
      ],
      columns: [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "score", header: "Score" },
      ],
      getRowId: (r) => r.id,
      ...options,
    }),
  );
}
for (const api of [control, candidate]) {
  for (const options of [
    {},
    { enablePagination: true },
    { enablePagination: false },
    { enablePagination: undefined },
  ]) {
    const enabled = options.enablePagination !== false;
    const html = run(api, {
      ...options,
      initialState: { pagination: { pageIndex: 0, pageSize: 1 } },
      renderTopToolbar: ({ table }) => {
        assert.equal(table.options.enablePagination, enabled);
        return table.options.enablePagination
          ? React.createElement(
              "section",
              { "data-caller-pagination": true },
              React.createElement(api.MRT_TablePagination, { table, position: "top" }),
            )
          : null;
      },
    });
    assert.equal(html.includes('data-caller-pagination="true"'), enabled);
    assert.equal(html.includes('>Geometry<'), !enabled);
  }
  const html = run(api, {
    initialState: {
      sorting: [{ id: "score", desc: false }],
      pagination: { pageIndex: 0, pageSize: 1 },
    },
  });
  assert.match(html, /Geometry/);
  assert.doesNotMatch(html, /&lt;Algebra&gt;/);
  assert.match(html, /<table/);
  assert.match(run(api), /&lt;Algebra&gt;/);
  assert.match(run(api, { data: [] }), /No records to display/);
  assert.match(
    run(api, {
      renderTopToolbar: () => React.createElement("p", null, "Custom toolbar"),
    }),
    /Custom toolbar/,
  );
}
assert.throws(() => run(candidate, { enableEditing: true }), /outside/);
assert.throws(
  () =>
    run(candidate, {
      columns: [
        {
          header: "Nested",
          columns: [{ accessorKey: "name", header: "Name" }],
        },
      ],
    }),
  /Nested headers/,
);
console.log(
  "Node/Bun SSR: resolved pagination defaults, caller toolbar visibility, sorted pagination, escaped values, empty data and custom toolbar pass both controls; unsupported editing/nesting reject.",
);
