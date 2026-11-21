"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { peer } = require("../../../scripts/mui-material-conformance/paths.cjs");
const { Rating } = require(
  require("../../../scripts/mui-material-conformance/prepare.cjs"),
);
const render = (props) =>
  peer("react-dom/server").renderToStaticMarkup(
    peer("react").createElement(Rating, props),
  );
test("a cleared WARML preference and an empty radio value stay distinct", () => {
  assert.doesNotMatch(render({ value: 0 }), /checked=""/);
  assert.match(render({ value: null }), /checked="" value=""/);
  assert.match(render({ readOnly: true, value: 3 }), /aria-label="3 Stars"/);
  assert.doesNotMatch(render({ readOnly: true, value: 3 }), /type="radio"/);
});
test("exposes whole-star precision explicitly", () =>
  assert.throws(() => render({ precision: 0.5 }), RangeError));
