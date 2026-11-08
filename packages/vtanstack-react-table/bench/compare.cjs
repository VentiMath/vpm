"use strict";
require("../../../scripts/react-table-conformance/check-controls.cjs").check();
const path = require("node:path"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module"),
  root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/react-table-conformance"),
  { load, peer } = require(path.join(fixture, "load.cjs")),
  React = peer("react"),
  render = peer("react-dom/server").renderToString;
const cases = [];
for (const [mode, control] of [
  ["useTable", "current"],
  ["useReactTable", "app"],
  ["useLegacyTable", "current"],
])
  for (const count of [10, 100])
    cases.push({
      name: mode + " SSR " + count + " rows",
      make(file) {
        const api = load(
            file === root
              ? root
              : path.join(
                  fixture,
                  "node_modules/.vpm-react-table/ssr-" + control + ".cjs",
                ),
          ),
          features = api.tableFeatures?.({
            rowSortingFeature: api.rowSortingFeature,
            sortedRowModel: api.createSortedRowModel?.(),
            sortFns: { basic: api.sortFn_basic },
          }),
          data = Array.from({ length: count }, (_, i) => ({
            topic: "Problem " + i,
            score: count - i,
          })),
          columns = [
            { accessorKey: "topic" },
            { accessorKey: "score", sortFn: "basic", sortingFn: "basic" },
          ];
        function View() {
          const t = api[mode]({
            features: mode === "useTable" ? features : undefined,
            data,
            columns,
            getCoreRowModel: api.getCoreRowModel?.(),
            getSortedRowModel: api.getSortedRowModel?.(),
            initialState: { sorting: [{ id: "score", desc: false }] },
          });
          return React.createElement(
            "table",
            null,
            React.createElement(
              "tbody",
              null,
              t
                .getRowModel()
                .rows.map((r) =>
                  React.createElement(
                    "tr",
                    { key: r.id },
                    React.createElement("td", null, r.getValue("topic")),
                    React.createElement("td", null, r.getValue("score")),
                  ),
                ),
            ),
          );
        }
        return () => render(React.createElement(View));
      },
      validate: (html) => {
        assert.equal(
          html,
          "<table><tbody>" +
            Array.from(
              { length: count },
              (_, i) =>
                `<tr><td>Problem ${count - i - 1}</td><td>${i + 1}</td></tr>`,
            ).join("") +
            "</tbody></table>",
        );
      },
    });
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(
      fixture,
      "node_modules/.vpm-react-table/ssr-current.cjs",
    ),
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/react-table-conformance/build.cjs",
      "../../scripts/react-table-conformance/provenance.json",
      "../../scripts/react-table-conformance/load.cjs",
      "../../scripts/react-table-conformance/package-lock.json",
      "../../scripts/react-table-conformance/node_modules/.vpm-react-table/ssr-current.cjs",
      "../../scripts/react-table-conformance/node_modules/.vpm-react-table/ssr-app.cjs",
      "../vtanstack-table-core/index.cjs",
      "../vtanstack-table-core/functions.cjs",
      "../vtanstack-store/index.cjs",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
