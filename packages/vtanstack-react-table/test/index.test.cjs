"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  {
    candidate,
    peer,
  } = require("../../../scripts/react-table-conformance/load.cjs"),
  api = candidate(),
  React = peer("react"),
  { renderToString } = peer("react-dom/server");
test("render dispatch preserves falsy text and element identity", () => {
  assert.equal(api.flexRender(0, {}), 0);
  assert.equal(api.flexRender("", {}), "");
  assert.equal(api.flexRender(false, {}), null);
  const e = React.createElement("span", null, "x");
  assert.equal(api.flexRender(e, {}), e);
});
test("component renderers are React elements rather than direct hook calls", () => {
  function C() {
    const [value] = React.useState("ready");
    return React.createElement("b", null, value);
  }
  assert.equal(renderToString(api.flexRender(C, {})), "<b>ready</b>");
});
test("FlexRender rejects ambiguous or missing inputs", () => {
  assert.throws(() => api.FlexRender({}), /exactly one/);
  assert.throws(() => api.FlexRender({ cell: {}, footer: {} }), /exactly one/);
});
test("current and legacy hooks render without a browser", () => {
  for (const hook of ["useTable", "useReactTable", "useLegacyTable"]) {
    function C() {
      const t = api[hook]({
        data: [{ n: 0 }],
        columns: [{ accessorKey: "n" }],
        getCoreRowModel: api.getCoreRowModel(),
      });
      return React.createElement(api.FlexRender, {
        cell: t.getRowModel().rows[0].getAllCells()[0],
      });
    }
    assert.equal(renderToString(React.createElement(C)), "0");
  }
});
