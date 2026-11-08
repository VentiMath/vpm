"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const themeable = require(process.env.VPM_THEMEABLE_ENTRY || "..");
test("classes preserve order, duplicates, raw keys and live theme lookups", () => {
  const key = Symbol("key"),
    theme = Object.assign(Object.create({ inherited: "base" }), {
      a: "A",
      b: "B",
      false: "F",
      0: "Z",
      "": "E",
    }),
    t = themeable(theme);
  assert.deepEqual(t(key, "a", "b", "a"), { key, className: "A B A" });
  assert.deepEqual(t(0, false, 0, "", null, "inherited"), {
    key: 0,
    className: "F Z E base",
  });
  theme.a = "changed";
  assert.deepEqual(t(undefined, "a"), { key: undefined, className: "changed" });
  assert.deepEqual(t("empty", "missing"), { key: "empty", style: {} });
});
test("style copies preserve enumerable symbols, getter order and shallow references", () => {
  const symbol = Symbol("color"),
    nested = { a: 1 },
    events = [];
  const first = Object.create({ inherited: 1 });
  Object.defineProperties(first, {
    a: {
      enumerable: true,
      get() {
        events.push("a");
        return 1;
      },
    },
    hidden: { value: 2 },
    nested: { enumerable: true, value: nested },
    [symbol]: {
      enumerable: true,
      get() {
        events.push("symbol");
        return "blue";
      },
    },
  });
  const second = {
    get a() {
      events.push("override");
      return 3;
    },
  };
  const result = themeable({ first, second })("key", "first", "second");
  assert.deepEqual(events, ["a", "symbol", "override"]);
  assert.equal(result.style.a, 3);
  assert.equal(result.style[symbol], "blue");
  assert.equal(result.style.nested, nested);
  assert(!Object.hasOwn(result.style, "hidden"));
  assert(!Object.hasOwn(result.style, "inherited"));
  assert.equal(
    Object.getOwnPropertyDescriptor(result.style, "a").get,
    undefined,
  );
  result.style.a = 5;
  assert.equal(second.a, 3);
});
test("prototype keys remain data and inputs stay unchanged", () => {
  const source = JSON.parse(
    '{"__proto__":{"changed":true},"constructor":"value","color":"red"}',
  );
  const result = themeable({ a: source })(1, "a").style;
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert(Object.hasOwn(result, "__proto__"));
  assert.equal(result.__proto__, source.__proto__);
  assert.equal(result.changed, undefined);
  assert.equal(result.constructor, "value");
  const frozen = Object.freeze({ color: "red" });
  assert.deepEqual(themeable({ a: frozen })(2, "a"), {
    key: 2,
    style: { color: "red" },
  });
});
test("decorators receive ordered original references, null this and empty selections", () => {
  const a = { color: "red" },
    b = { color: "blue" },
    calls = [];
  const t = themeable([
    { a, b },
    function (...values) {
      calls.push({ receiver: this, values });
      return values.map((x) => x.color).join(" ");
    },
  ]);
  assert.deepEqual(t("key", "b", false, "a", "b"), {
    key: "key",
    className: "blue red blue",
  });
  assert.equal(calls[0].receiver, null);
  assert.equal(calls[0].values[0], b);
  assert.deepEqual(t(0, "absent"), { key: 0, className: "" });
  assert.deepEqual(calls[1].values, []);
});
test("mode follows first selected value, and theme getters are read once", () => {
  let reads = 0;
  const t = themeable({
    get a() {
      reads++;
      return "A";
    },
    b: { color: "blue" },
  });
  assert.deepEqual(t(1, "a", "b"), { key: 1, className: "A [object Object]" });
  assert.equal(reads, 1);
  assert.deepEqual(t(2, "b", "a"), {
    key: 2,
    style: { 0: "A", color: "blue" },
  });
  assert.equal(reads, 2);
  for (const bad of [null, undefined, 3, "x", [], [{}, null]])
    assert.throws(() => themeable(bad), TypeError);
});

test("native copying observes deletions but not properties added during a getter", () => {
  const symbol = Symbol("added");
  const source = {
    get first() {
      delete this.removed;
      this.added = 3;
      this[symbol] = 4;
      return 1;
    },
    removed: 2,
  };
  assert.deepEqual(themeable({ x: source })("k", "x"), {
    key: "k",
    style: { first: 1 },
  });
  const marker = Symbol("name");
  assert.deepEqual(themeable({ [marker]: "SymbolClass" })(false, marker), {
    key: false,
    className: "SymbolClass",
  });
});
