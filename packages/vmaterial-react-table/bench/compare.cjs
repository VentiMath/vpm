"use strict";
// Both implementations use the same production React/MUI runtime.
process.env.NODE_ENV = "production";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/react-table-conformance");
const cases = [
  ["10 rows", 10, {}],
  [
    "100 rows paged",
    100,
    { initialState: { pagination: { pageIndex: 0, pageSize: 15 } } },
  ],
  [
    "50 rows sorted",
    50,
    {
      initialState: {
        sorting: [{ id: "score", desc: false }],
        pagination: { pageIndex: 0, pageSize: 15 },
      },
    },
  ],
].map(([name, count, options]) => ({
  name: "Widget SSR " + name,
  make(file) {
    const {
        load,
        peer,
      } = require("../../../scripts/material-table-conformance/load.cjs"),
      React = peer("react"),
      render = peer("react-dom/server").renderToString;
    const api = load(
      path.join(
        fixture,
        "node_modules/.vpm-material-table/ssr-" +
          (file === root ? "vpm" : "app") +
          ".cjs",
      ),
    );
    const data = Array.from({ length: count }, (_, i) => ({
      id: "r" + i,
      name: "Problem " + i,
      score: count - i,
    }));
    const props = {
      data,
      columns: [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "score", header: "Score" },
      ],
      getRowId: (r) => r.id,
      ...options,
    };
    return () => render(React.createElement(api.MaterialReactTable, props));
  },
  validate(html) {
    const tbody = html.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1];
    assert.ok(tbody);
    assert.equal(
      (tbody.match(/<tr\b/g) || []).length,
      Math.min(count, options.initialState?.pagination.pageSize ?? 10),
    );
    assert.ok(tbody.includes("Problem " + (name.includes("sorted") ? 49 : 0)));
  },
}));
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(
      "../../../scripts/react-table-conformance/node_modules/material-react-table",
    ),
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../vtanstack-react-table/index.cjs",
      "../vtanstack-table-core/index.cjs",
      "../vtanstack-table-core/functions.cjs",
      "../vtanstack-store/index.cjs",
      "../vtanstack-match-sorter-utils/index.cjs",
      "../vhighlight-words/index.cjs",
      "../../scripts/material-table-conformance/load.cjs",
      "../../scripts/material-table-conformance/build.cjs",
      "../../scripts/react-table-conformance/package-lock.json",
      "../../scripts/react-table-conformance/node_modules/.vpm-material-table/ssr-app.cjs",
      "../../scripts/react-table-conformance/node_modules/.vpm-material-table/ssr-vpm.cjs",
      "../../scripts/react-table-conformance/node_modules/@mui/material",
      "../../scripts/react-table-conformance/node_modules/react",
      "../../scripts/react-table-conformance/node_modules/react-dom",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
