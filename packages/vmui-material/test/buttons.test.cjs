"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const { peer } = require("../../../scripts/mui-material-conformance/paths.cjs"),
  React = peer("react"),
  render = peer("react-dom/server").renderToString;
const api = require(
    require("../../../scripts/mui-material-conformance/prepare.cjs"),
  ),
  h = React.createElement;
const html = (Component, props, children = "Contest") =>
  render(h(Component, { disableRipple: true, ...props }, children));
test("default and explicit undefined options preserve ordinary buttons", () => {
  for (const name of ["Button", "IconButton", "Fab", "ToggleButton"]) {
    const s = html(api[name], {
      variant: undefined,
      size: undefined,
      color: undefined,
      value: "math",
    });
    assert.match(s, /<button/);
    assert.match(s, /type="button"/);
    assert.doesNotMatch(s, /undefined|NaN/);
  }
});
test("disabled custom roots use aria and leave the tab order", () => {
  const s = html(api.Button, { component: "div", disabled: true });
  assert.match(s, /role="button"/);
  assert.match(s, /aria-disabled="true"/);
  assert.match(s, /tabindex="-1"/);
  assert.doesNotMatch(s, /<div[^>]* disabled=/);
});
test("loading retains a named progress indicator and disables the control", () => {
  const s = html(api.Button, { loading: true, "aria-label": "Submit answers" });
  assert.match(s, /role="progressbar"/);
  assert.match(s, /aria-label="Submit answers"/);
  assert.match(s, /disabled=""/);
});
test("content stays escaped and refs/styles are not serialized as attributes", () => {
  const s = html(
    api.Button,
    { action: React.createRef(), disableElevation: true, sx: { p: 2 } },
    "<img onerror=x>",
  );
  assert.match(s, /&lt;img/);
  assert.doesNotMatch(s, /<img|ownerState=|disableElevation=|sx=|action=/);
});
test("group selection compares values by identity and does not mutate input", () => {
  const value = Object.freeze([1, 3]),
    children = [1, 2, 3].map((n) =>
      h(api.ToggleButton, { key: n, value: n }, n),
    );
  const s = render(h(api.ToggleButtonGroup, { value }, children));
  assert.equal((s.match(/aria-pressed="true"/g) || []).length, 2);
  assert.deepEqual(value, [1, 3]);
});
test("button group defaults reach children while explicit values override", () => {
  const s = render(
    h(
      api.ButtonGroup,
      { color: "secondary", variant: "outlined", size: "small" },
      h(api.Button, { disabled: true }, "Next"),
      h(api.Button, { size: "large" }, "Previous"),
    ),
  );
  assert.match(s, /MuiButton-outlinedSecondary/);
  assert.match(s, /MuiButton-sizeSmall/);
  assert.match(s, /MuiButton-sizeLarge/);
});
test("custom ripple props fail explicitly instead of disappearing", () => {
  assert.throws(
    () =>
      html(api.ButtonBase, { TouchRippleProps: { classes: { root: "x" } } }),
    /Custom TouchRipple/,
  );
});
test("utility classes preserve global state names", () => {
  assert.equal(api.getButtonUtilityClass("disabled"), "Mui-disabled");
  assert.equal(
    api.getButtonBaseUtilityClass("focusVisible"),
    "Mui-focusVisible",
  );
  assert.equal(api.buttonClasses.root, "MuiButton-root");
  assert.equal(Object.isFrozen(api.buttonClasses), true);
});

test("custom button components default to native type and disabled semantics", () => {
  const MotionLikeButton = React.forwardRef((props, ref) => h("button", {...props, ref}));
  for (const name of ["ButtonBase", "Button", "IconButton", "Fab", "ToggleButton"]) {
    const s = html(api[name], {component: MotionLikeButton, disabled:true, value:"math"});
    assert.match(s, /<button[^>]*type="button"/);
    assert.match(s, /disabled=""/);
    assert.match(s, /tabindex="-1"/);
    assert.doesNotMatch(s, /role="button"|aria-disabled|nativeButton/);
  }
});
test("custom nonbutton roots explicitly opt into ARIA semantics and routers remain links", () => {
  const Custom = React.forwardRef((props, ref) => h("div", {...props, ref}));
  const s=html(api.ButtonBase,{component:Custom,nativeButton:false,disabled:true});
  assert.match(s,/role="button"/);assert.match(s,/aria-disabled="true"/);
  assert.doesNotMatch(s,/type="button"| disabled=""|nativeButton/);
  const Route = React.forwardRef((props, ref) => h("a", {...props, ref}));
  assert.doesNotMatch(html(api.Button,{component:Route,href:"/contest"}),/type="button"|role="button"/);
});
