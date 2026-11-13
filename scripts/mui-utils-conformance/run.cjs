"use strict";
const assert = require("node:assert/strict"),
  React = require("react"),
  own = require(require("./prepare.cjs"));
const current = require("@mui/utils"),
  app = require("mui-utils-app");
let count = 0;
function check(name, args, control) {
  if (!control[name]) return;
  const a = structuredClone(args),
    b = structuredClone(args);
  assert.deepEqual(
    own[name](...a),
    control[name](...b),
    name + " " + JSON.stringify(args),
  );
  assert.deepEqual(a, b, name + " input mutation");
  count++;
}
for (const control of [current, app]) {
  for (let i = 0; i < 600; i++) {
    check(
      "deepmerge",
      [
        {
          colors: { main: "blue", contrast: "white" },
          spacing: i,
          arr: [1, 2],
        },
        {
          colors: { main: ["red", "green", "blue"][i % 3] },
          arr: [i],
          variant: { border: i % 3 },
        },
        { clone: i % 2 === 0 },
      ],
      control,
    );
    check(
      "internal_resolveProps",
      [
        {
          disabled: true,
          slotProps: {
            root: { id: "base", className: "base", style: { color: "blue" } },
          },
          className: "a",
          style: { margin: 2 },
        },
        {
          disabled: i % 2 === 0,
          slotProps: { root: { className: "own", style: { color: "red" } } },
          className: "b",
          style: { padding: i },
        },
        i % 2 === 0,
      ],
      control,
    );
    check(
      "unstable_generateUtilityClass",
      [
        "MuiButton",
        ["root", "disabled", "focusVisible", "selected", "arbitrary"][i % 5],
      ],
      control,
    );
    check(
      "unstable_fastObjectShallowCompare",
      [
        { a: i, b: 2 },
        { a: i, b: i % 2 ? 2 : 3 },
      ],
      control,
    );
    check(
      "unstable_fastDeepAssign",
      [
        { base: 1 },
        {
          "@media(min-width:600px)": { padding: i, color: "red" },
          "@media(min-width:900px)": { padding: i + 1 },
        },
      ],
      control,
    );
    check("clamp", [i - 250, -20, 100], control);
  }
  for (const name of ["plain", "éclair", "ßeta", "", "foo-bar"])
    check("unstable_capitalize", [name], control);
  for (const value of [
    null,
    [],
    {},
    new Date(),
    Object.create(null),
    /a/,
    React.createElement("div"),
  ]) {
    assert.equal(own.isPlainObject(value), control.isPlainObject(value));
    count++;
  }
  const slots = {
      root: ["root", false, "disabled", undefined, "selected"],
      label: ["label"],
    },
    classes = { root: "custom", disabled: "off" };
  assert.deepEqual(
    own.unstable_composeClasses(slots, (s) => "Mui-" + s, classes),
    control.unstable_composeClasses(slots, (s) => "Mui-" + s, classes),
  );
  count++;
  for (const type of [
    "div",
    function Named() {},
    React.forwardRef(function Forward() {}),
    React.memo(function Memo() {}),
  ]) {
    assert.equal(own.getDisplayName(type), control.getDisplayName(type));
    count++;
  }
  for (const child of [
    null,
    "text",
    0,
    false,
    React.createElement("b"),
    [React.createElement("i", { key: "k" }), null],
  ]) {
    assert.deepEqual(
      own.getValidReactChildren(child),
      control.getValidReactChildren(child),
    );
    count++;
  }
  for (const value of [
    React.createElement("div"),
    React.createElement("div", { ref: () => {} }),
  ]) {
    assert.equal(
      own.unstable_getReactElementRef(value),
      control.unstable_getReactElementRef(value),
    );
    count++;
  }
  const source = React.createElement("span", { id: "x" }),
    a = own.deepmerge({}, { source }),
    b = control.deepmerge({}, { source });
  assert.deepEqual(a, b);
  assert.equal(a.source, source);
  assert.equal(b.source, source);
  count++;
  if (control === current) {
    assert.deepEqual(own.visuallyHidden, control.visuallyHidden);
    count++;
  }
}
for (const name of [
  "appendOwnerState",
  "mergeSlotProps",
  "resolveComponentProps",
  "extractEventHandlers",
  "omitEventHandlers",
  "isEventHandler",
]) {
  const a = require(
      require("./prepare.cjs").replace("runtime.cjs", "internals.cjs"),
    )[name],
    b = require("@mui/utils/" + name).default;
  if (name === "mergeSlotProps")
    for (const get of [false, true])
      for (const i of [0, 1, 2]) {
        const fn = () => {},
          options = {
            getSlotProps: get
              ? (events) => ({
                  onClick: events.onClick,
                  className: "internal",
                  style: { color: "red" },
                  ref: fn,
                })
              : undefined,
            additionalProps: {
              className: "additional",
              style: { padding: 2 },
              id: 1,
            },
            externalForwardedProps: {
              className: "forward",
              style: { color: "green" },
              onClick: fn,
            },
            externalSlotProps: {
              className: i ? "slot" : undefined,
              style: { margin: 1 },
              id: 2,
            },
            className: "manual",
          };
        assert.deepEqual(a(options), b(options));
        count++;
      }
  if (name === "appendOwnerState")
    for (const type of [undefined, "button", () => null]) {
      const props = { ownerState: { a: 1 }, id: "p" },
        state = { b: 2 };
      assert.deepEqual(a(type, props, state), b(type, props, state));
      count++;
    }
  if (name === "extractEventHandlers" || name === "omitEventHandlers") {
    const input = {
      onClick() {},
      onchange() {},
      onClickCapture() {},
      onclick: 4,
      other: 2,
    };
    assert.deepEqual(a(input), b(input));
    count++;
  }
  if (name === "resolveComponentProps") {
    const fn = (state, slot) => ({ state, slot });
    assert.deepEqual(a(fn, 1, 2), b(fn, 1, 2));
    count++;
  }
  if (name === "isEventHandler")
    for (const key of [
      "onClick",
      "onclick",
      "on",
      "on9",
      "onÄ",
      "onClickCapture",
    ]) {
      assert.equal(
        a(key, () => {}),
        b(key, () => {}),
      );
      count++;
    }
}
console.log(count + " utility comparisons match current/app controls");
