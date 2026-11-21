"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { peer } = require("../../../scripts/mui-material-conformance/paths.cjs");
const h = peer("react").createElement;
const render = peer("react-dom/server").renderToStaticMarkup;
const { Grid } = require(
  require("../../../scripts/mui-material-conformance/prepare.cjs"),
);

test("the archive’s grid emits responsive sizes and combines inherited CSS variables", () => {
  const html = render(
    h(
      Grid,
      { container: true, columns: 8, spacing: 2 },
      h(Grid, { size: { xs: 8, sm: 4, md: 2 } }, "2026"),
    ),
  );
  for (const rule of [
    "--Grid-parent-columns:8",
    "--Grid-parent-rowSpacing:16px",
    "--Grid-parent-columnSpacing:16px",
    "MuiGrid-grid-sm-4",
    "min-width:600px",
    "min-width:900px",
  ]) {
    assert.ok(html.includes(rule), rule);
  }
  assert.doesNotMatch(
    render(h(Grid, { size: 4 }, "2026")),
    /gap:|MuiGrid-container/,
  );
});

test("columns and spacing preserve ascending media query order", () => {
  const html = render(
    h(Grid, { container: true, columns: { md: 8 }, spacing: { sm: 1, md: 2 } }),
  );
  const small = html.indexOf("min-width:600px"),
    medium = html.indexOf("min-width:900px");
  assert.ok(small >= 0 && small < medium);
});
