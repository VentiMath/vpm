"use strict";
const assert = require("node:assert/strict"),
  { run, create } = require("./cases.cjs");
const candidate = require(
    process.env.VPM_TABLE_ENTRY || "../../packages/vtanstack-table-core",
  ),
  app = require("table-app"),
  current = require("@tanstack/table-core");
const actual = run(candidate, false),
  expected = run(app, false);
for (let i = 0; i < actual.length; i++)
  for (const k of Object.keys(actual[i]))
    assert.deepEqual(
      actual[i][k],
      expected[i][k],
      "Table8 " + actual[i].label + " " + k,
    );
const modern = run(candidate, true),
  control = run(current, true);
for (let i = 0; i < modern.length; i++)
  for (const k of Object.keys(modern[i]))
    assert.deepEqual(
      modern[i][k],
      control[i][k],
      "Table9 " + modern[i].label + " " + k,
    );
for (const [api, latest] of [
  [candidate, false],
  [candidate, true],
]) {
  const t = create(api, latest);
  assert.equal(t.getRowModel(), t.getRowModel());
  const first = t.getCoreRowModel();
  t.setSorting([{ id: "price", desc: true }]);
  assert.equal(first, t.getCoreRowModel());
  t.setOptions((o) => ({
    ...o,
    data: [{ id: "__proto__", name: "safe", price: 1 }],
  }));
  assert.equal(t.getRow("__proto__").original.name, "safe");
  assert.throws(
    () =>
      create(api, latest, { data: [{ id: "a" }, { id: "a" }] }).getRowModel(),
    /Duplicate row/,
  );
}
console.log(
  "Table8 and Table9: 14 application state transitions match; cache identity and hostile IDs pass.",
);
for (const api of [candidate, app]) {
  const t = create(api, false);
  t.setGrouping(["category"]);
  t.getRowModel().rows[0].toggleSelected();
  const selected = t.getGroupedSelectedRowModel();
  assert.equal(selected.rows.length, 1);
  assert.equal(selected.flatRows.length, 25);
  t.setExpanded(true);
  assert.equal(t.getRowModel().flatRows.length, 39);
}
