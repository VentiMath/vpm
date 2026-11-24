"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { peer } = require("../../../scripts/mui-material-conformance/paths.cjs"),
  R = peer("react"),
  render = peer("react-dom/server").renderToStaticMarkup,
  own = require(require("../../../scripts/mui-material-conformance/prepare.cjs"));
const inline = { disablePortal: true, anchorEl: null };
// React reports an unknown element attribute once per process, so every render
// in this file is watched.
const complaints = [];
function output(props, seen = []) {
  const report = console.error;
  console.error = (...args) => complaints.push(args.join(" "));
  try {
    return render(
      R.createElement(own.Popper, { ...inline, ...props }, (options) => {
        seen.push(options);
        return R.createElement("section", null, "Calendar");
      }),
    ).replace(/<style[\s\S]*?<\/style>/g, "");
  } finally {
    console.error = report;
  }
}
test("a transition child is told the open state and how to report back", () => {
  const seen = [];
  const html = output({ open: true, transition: true }, seen);
  assert.match(html, />Calendar</);
  assert.deepEqual(Object.keys(seen[0]).sort(), ["TransitionProps", "placement"]);
  assert.equal(seen[0].placement, "bottom");
  assert.equal(seen[0].TransitionProps.in, true);
  assert.equal(typeof seen[0].TransitionProps.onEnter, "function");
  assert.equal(typeof seen[0].TransitionProps.onExited, "function");
});
test("without a transition the child is told only the placement", () => {
  const seen = [];
  output({ open: true, placement: "top-start" }, seen);
  assert.equal(seen[0].placement, "top-start");
  assert.equal(seen[0].TransitionProps, undefined);
});
test("the transition request never reaches the panel element", () => {
  for (const transition of [true, false])
    assert.doesNotMatch(output({ open: true, transition }), /transition/i);
  assert.deepEqual(complaints, []);
});
test("a closed transition panel that has not entered is not rendered", () => {
  const seen = [];
  assert.equal(output({ open: false, transition: true }, seen), "");
  assert.deepEqual(seen, []);
});
test("a retained transition panel stays out of layout with its child closed", () => {
  const seen = [];
  const html = output({ open: false, transition: true, keepMounted: true }, seen);
  assert.match(html, /display:none/);
  assert.match(html, />Calendar</);
  assert.equal(seen[0].TransitionProps.in, false);
});
test("an open transition panel is laid out before its child has entered", () => {
  assert.doesNotMatch(output({ open: true, transition: true, keepMounted: true }), /display:none/);
});
