"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const fixture = path.resolve(
  __dirname,
  "../../../scripts/mui-utils-conformance",
);
const compiled = require(fixture + "/prepare.cjs"),
  api = require(compiled.replace("runtime.cjs", "internals.cjs"));
const tick = (ms) => new Promise((r) => setTimeout(r, ms));
test("deep assignment and merge preserve inputs and prototype-named data", () => {
  const source = JSON.parse(
    '{"__proto__":{"polluted":true},"constructor":{"prototype":{"bad":true}},"color":{"main":"blue"}}',
  );
  for (const operation of [api.deepmerge, api.fastDeepAssign]) {
    const target = {},
      out = operation(target, source);
    assert.equal(Object.getPrototypeOf(out), Object.prototype);
    assert.equal(Object.hasOwn(out, "__proto__"), true);
    assert.equal(out.__proto__.polluted, true);
    assert.equal({}.polluted, undefined);
    assert.equal({}.bad, undefined);
    out.color.main = "red";
    assert.equal(source.color.main, "blue");
  }
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => api.deepmerge({}, cycle), /cyclic/);
  assert.throws(() => api.fastDeepAssign({}, cycle), /cyclic/);
});
test("class names never inherit global-state entries", () => {
  for (const key of ["__proto__", "constructor", "toString"]) {
    assert.equal(api.isGlobalState(key), false);
    assert.equal(api.generateUtilityClass("MuiThing", key), "MuiThing-" + key);
  }
  const names = api.generateUtilityClasses("Thing", ["__proto__", "root"]);
  assert.equal(Object.hasOwn(names, "__proto__"), true);
  assert.equal(names.__proto__, "Thing-__proto__");
  api.ClassNameGenerator.configure((name) => "Custom" + name);
  try {
    assert.equal(api.generateUtilityClass("Thing", "root"), "CustomThing-root");
    assert.equal(api.generateUtilityClass("Thing", "disabled"), "Mui-disabled");
  } finally {
    api.ClassNameGenerator.reset();
  }
});
test("own property comparison uses Object.is", () => {
  assert.equal(api.fastObjectShallowCompare({ a: NaN }, { a: NaN }), true);
  assert.equal(api.fastObjectShallowCompare({ a: -0 }, { a: 0 }), false);
  assert.equal(
    api.fastObjectShallowCompare({ a: 1 }, Object.create({ a: 1 })),
    false,
  );
});
test("slot event handlers are passed through the owning hook once", () => {
  const events = [],
    handler = () => events.push("external");
  const out = api.mergeSlotProps({
    getSlotProps: (external) => ({
      onClick: () => {
        events.push("internal");
        external.onClick();
      },
      className: "internal",
    }),
    externalSlotProps: { onClick: handler, className: "external" },
    className: "manual",
  });
  out.props.onClick();
  assert.deepEqual(events, ["internal", "external"]);
  assert.equal(out.props.className, "internal manual external");
});
test("debounce retains this and last arguments and clears pending callbacks", async () => {
  let result;
  const obj = {
    value: 5,
    fn: api.debounce(function (value) {
      result = this.value + value;
    }, 5),
  };
  obj.fn(1);
  obj.fn(2);
  await tick(20);
  assert.equal(result, 7);
  obj.fn(8);
  obj.fn.clear();
  await tick(20);
  assert.equal(result, 7);
});
test("Timeout replacement, reentrant scheduling and disposal retain ownership", async () => {
  const timer = new api.Timeout(),
    seen = [];
  timer.start(0, () => seen.push("cancelled"));
  timer.start(1, () => {
    seen.push("first");
    timer.start(1, () => seen.push("second"));
  });
  await tick(20);
  assert.deepEqual(seen, ["first", "second"]);
  assert.equal(timer.currentId, null);
  timer.start(5, () => seen.push("late"));
  timer.disposeEffect()();
  await tick(15);
  assert.deepEqual(seen, ["first", "second"]);
});
test("chain callbacks preserve receiver and validation remains active", () => {
  const events = [],
    fn = api.createChainedFunction(
      function (n) {
        events.push(this.x + n);
      },
      null,
      (n) => events.push(n),
    );
  fn.call({ x: 3 }, 2);
  assert.deepEqual(events, [5, 2]);
  assert.ok(api.integerPropType({ n: 1.2 }, "n"));
  assert.equal(api.integerPropType({ n: 2 }, "n"), null);
  assert.ok(api.integerPropType.isRequired({}, "n"));
  assert.ok(api.unsupportedProp({ n: false }, "n"));
  assert.equal(api.unsupportedProp({}, "n"), null);
});
