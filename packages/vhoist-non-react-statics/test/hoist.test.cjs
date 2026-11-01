"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const vpm = require(".."),
  original = require("../../../scripts/hoist-conformance/node_modules/hoist-non-react-statics"),
  React = require("../../../scripts/hoist-conformance/node_modules/react");
test("ordinary descriptors, symbols, blacklist and target identity agree", () => {
  for (const hoist of [original, vpm]) {
    const key = Symbol("custom");
    let reads = 0;
    function Source() {}
    function Target() {}
    Source.keep = 42;
    Source.skip = 7;
    Source[key] = 9;
    Object.defineProperty(Source, "computed", {
      get() {
        reads++;
        return this.keep;
      },
      configurable: true,
    });
    const result = hoist(Target, Source, { skip: true });
    assert.equal(result, Target);
    assert.equal(reads, 0);
    assert.equal(Target.computed, 42);
    assert.equal(Target[key], 9);
    assert.equal(Target.skip, undefined);
    assert.deepEqual(
      Object.getOwnPropertyDescriptor(Target, "computed"),
      Object.getOwnPropertyDescriptor(Source, "computed"),
    );
    assert.equal(hoist(Target, "div"), Target);
  }
});
test("memo and forwardRef retain React-owned statics on source and target", () => {
  for (const hoist of [original, vpm])
    for (const wrap of [React.memo, (fn) => React.forwardRef(fn)]) {
      const Source = wrap(() => null),
        Target = wrap(() => null);
      Source.extra = 123;
      const before = Object.getOwnPropertyDescriptors(Target);
      hoist(Target, Source);
      assert.equal(Target.extra, 123);
      for (const key of [
        "$$typeof",
        "type",
        "render",
        "compare",
        "displayName",
      ])
        assert.deepEqual(
          Object.getOwnPropertyDescriptor(Target, key),
          before[key],
        );
    }
});
test("prototype-named own statics are preserved without changing target prototype", () => {
  for (const [hoist, fixed] of [
    [original, false],
    [vpm, true],
  ]) {
    function Source() {}
    function Target() {}
    const proto = Object.getPrototypeOf(Target);
    for (const key of [
      "constructor",
      "toString",
      "hasOwnProperty",
      "__proto__",
    ])
      Object.defineProperty(Source, key, {
        value: "custom-" + key,
        configurable: true,
      });
    hoist(Target, Source);
    for (const key of [
      "constructor",
      "toString",
      "hasOwnProperty",
      "__proto__",
    ])
      assert.equal(Object.hasOwn(Target, key), fixed);
    assert.equal(Object.getPrototypeOf(Target), proto);
  }
});
test("nearest inherited descriptor wins before nonconfigurable definitions are installed", () => {
  for (const [hoist, fixed] of [
    [original, false],
    [vpm, true],
  ]) {
    const Parent = Object.create(null);
    Object.defineProperty(Parent, "version", { value: 1 });
    const Child = Object.create(Parent);
    Object.defineProperty(Child, "version", { value: 2 });
    const target = {};
    hoist(target, Child);
    assert.equal(target.version, fixed ? 2 : 1);
    assert.equal(
      Object.getOwnPropertyDescriptor(target, "version").configurable,
      false,
    );
  }
});
test("deep inheritance and proxy cycles cannot overflow or loop", () => {
  let source = Object.assign(Object.create(null), { base: true });
  for (let i = 0; i < 12000; i++) source = Object.create(source);
  source.top = true;
  if (process.versions.bun) assert.equal(original({}, source).base, true);
  else assert.throws(() => original({}, source), RangeError);
  const target = vpm({}, source);
  assert.equal(target.base, true);
  assert.equal(target.top, true);
  let proxy;
  proxy = new Proxy({}, { getPrototypeOf: () => proxy });
  assert.throws(() => vpm({}, proxy), /cyclic/);
});
test("classification does not evaluate $$typeof getters; failed target definitions preserve others", () => {
  let reads = 0;
  const source = { extra: 1 };
  Object.defineProperty(source, "$$typeof", {
    get() {
      reads++;
      return Symbol.for("react.memo");
    },
  });
  const targetWithTag = vpm({}, source);
  assert.equal(Object.hasOwn(targetWithTag, "$$typeof"), false);
  assert.equal(reads, 0);
  original({}, source);
  assert.ok(reads > 0);
  const target = {};
  Object.defineProperty(target, "extra", { value: 0 });
  vpm(target, { extra: 1, next: 2 });
  assert.equal(target.extra, 0);
  assert.equal(target.next, 2);
});
test("native function prototype is not copied onto component wrappers", () => {
  function Source() {}
  function Target() {}
  vpm(Target, Source);
  assert.equal(Object.hasOwn(Target, "apply"), false);
  assert.equal(Object.hasOwn(Target, "call"), false);
  assert.equal(Object.hasOwn(Target, Symbol.hasInstance), false);
});
