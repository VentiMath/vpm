"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { peer } = require("../../../scripts/mui-material-conformance/paths.cjs");
const React = peer("react"),
  render = peer("react-dom/server").renderToStaticMarkup;
const { Stack } = require(
  require("../../../scripts/mui-material-conformance/prepare.cjs"),
);
const output = (p) =>
  render(
    React.createElement(
      Stack,
      p,
      React.createElement("a", { href: "#team" }, "Team"),
    ),
  );
test("unspaced Stacks preserve child margins; legacy ARML layout props become CSS", () => {
  assert.doesNotMatch(output({}), /margin:0|margin-top:0/);
  const html = output({
    direction: "row",
    spacing: 1.5,
    alignItems: "center",
    flexWrap: "wrap",
    component: "nav",
  });
  assert.match(html, /<nav class="MuiStack-root/);
  for (const prop of [
    "flex-direction:row",
    "flex-wrap:wrap",
    "align-items:center",
    "margin-left:12px",
  ])
    assert.ok(html.includes(prop), prop);
  assert.doesNotMatch(html, /<nav[^>]* (alignItems|flexWrap)=/);
});
test("spacing begins at the first requested breakpoint and follows direction changes", () => {
  const html = output({
    direction: { sm: "row", md: "column-reverse" },
    spacing: 2,
  });
  assert.doesNotMatch(html, /min-width:0px/);
  assert.match(html, /min-width:600px.*margin-left:16px/);
  assert.match(html, /min-width:900px.*margin-bottom:16px/);
  const delayed = output({ direction: "row", spacing: { md: 2 } });
  assert.doesNotMatch(delayed.slice(0, delayed.indexOf("@media")), /margin:0/);
});
test("responsive directions from a frozen array select the right margin", () => {
  const html = output({
    direction: Object.freeze([null, "row"]),
    spacing: Object.freeze([null, 2]),
  });
  assert.match(html, /margin-left:16px/);
  assert.doesNotMatch(html, /marginundefined/);
});
