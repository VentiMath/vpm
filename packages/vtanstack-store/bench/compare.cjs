"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/store-conformance");
const cases = [
  {
    name: "Table9 sort 100 rows",
    make(file) {
      return require(
        path.join(
          fixture,
          "node_modules/.vpm-store",
          file === root ? "vpm.cjs" : "upstream.cjs",
        ),
      ).makeBenchmark();
    },
    validate: (x) => assert.equal(x, true),
  },

  {
    name: "Create store and read",
    make(file) {
      const { createStore } = require(file);
      return () => createStore(1).get();
    },
    validate: (x) => assert.equal(x, 1),
  },
  {
    name: "Cached computed read",
    make(file) {
      const { createAtom } = require(file),
        a = createAtom(3),
        b = createAtom(() => a.get() * 2);
      b.get();
      return () => b.get();
    },
    validate: (x) => assert.equal(x, 6),
  },
  {
    name: "Subscribed diamond update",
    make(file) {
      const { createAtom } = require(file),
        a = createAtom(0),
        b = createAtom(() => a.get() * 2),
        c = createAtom(() => a.get() + 1),
        d = createAtom(() => b.get() + c.get());
      let value = 0,
        i = 0;
      d.subscribe((x) => (value = x));
      return () => {
        a.set(++i);
        return value === i * 3 + 1;
      };
    },
    validate: (x) => assert.equal(x, true),
  },
  {
    name: "Batched 16-column selection",
    make(file) {
      const { createAtom, batch } = require(file),
        a = createAtom(0),
        columns = Array.from({ length: 16 }, (_, i) =>
          createAtom(() => a.get() + i),
        ),
        sum = createAtom(() => columns.reduce((s, c) => s + c.get(), 0));
      let value = 0,
        i = 0;
      sum.subscribe((x) => (value = x));
      return () => {
        batch(() => {
          a.set(++i);
          a.set(++i);
        });
        return value === 16 * i + 120;
      };
    },
    validate: (x) => assert.equal(x, true),
  },
  {
    name: "Shallow table state equality",
    make(file) {
      const { shallow } = require(file),
        a = {
          sorting: [],
          pagination: { pageIndex: 0 },
          rowSelection: {},
          columnVisibility: {},
        },
        b = { ...a };
      return () => shallow(a, b);
    },
    validate: (x) => assert.equal(x, true),
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(
      path.join(fixture, "node_modules/@tanstack/store"),
    ),
    vpm: root,
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "index.d.cts",
      "index.d.mts",
      "package.json",
      "PROVENANCE.json",
      "bench/compare.cjs",
      "../../scripts/store-conformance/package-lock.json",
      "../../scripts/store-conformance/table.mjs",
      "../../scripts/store-conformance/build.cjs",
      "../../scripts/store-conformance/node_modules/@tanstack/table-core/dist",
      "../../scripts/store-conformance/node_modules/@tanstack/store/dist",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
