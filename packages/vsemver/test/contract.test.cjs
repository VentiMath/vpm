"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const v = require(".."),
  u = require("../../../scripts/source-map-conformance/node_modules/semver-current"),
  f = require("./upstream-fixtures.json");
let checks = 0;
function outcome(fn) {
  try {
    return fn();
  } catch (e) {
    return { throws: e.name };
  }
}
function check(name, args) {
  checks++;
  assert.deepEqual(
    outcome(() => v[name](...args)),
    outcome(() => u[name](...args)),
    name + " " + JSON.stringify(args),
  );
}
test("upstream version, range and intersection fixtures", () => {
  for (const name of ["range-include", "range-exclude"])
    for (const [r, x, o] of f[name]) check("satisfies", [x, r, o]);
  for (const [r, , o] of f["range-parse"]) check("validRange", [r, o]);
  for (const [a, b, , o] of f["range-intersection"])
    check("intersects", [a, b, o]);
  for (const [a, b, , o] of f["comparator-intersection"])
    assert.equal(
      outcome(() =>
        new v.Comparator(a, o).intersects(new v.Comparator(b, o), o),
      ),
      outcome(() =>
        new u.Comparator(a, o).intersects(new u.Comparator(b, o), o),
      ),
    );
  for (const [a, b, o] of [...f.comparisons, ...f.equality])
    for (const method of [
      "compare",
      "compareBuild",
      "diff",
      "gt",
      "gte",
      "lt",
      "lte",
      "eq",
      "neq",
    ])
      check(method, [a, b, o]);
  for (const name of ["valid-versions", "invalid-versions"])
    for (const row of f[name]) {
      const x = Array.isArray(row) ? row[0] : row;
      for (const o of [undefined, true])
        for (const method of ["valid", "clean", "prerelease"])
          check(method, [x, o]);
    }
  for (const [method, ...args] of f.operations)
    if (method === "coerce") {
      const simplify = (s) => s && [s.version, s.build];
      assert.deepEqual(
        simplify(v.coerce(...args)),
        simplify(u.coerce(...args)),
        JSON.stringify(args),
      );
    } else check(method, args);
});
test("generated release, prerelease and build comparisons", () => {
  let seed = 73;
  function pick(n) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % n;
  }
  function version() {
    return (
      [pick(4), pick(6), pick(12)].join(".") +
      ["", "-alpha.0", "-beta.2", "-rc.1", "+build.2", "-0", "-10"][pick(7)]
    );
  }
  for (let i = 0; i < 3000; i++) {
    const a = version(),
      b = version(),
      o = { includePrerelease: !!pick(2), loose: !!pick(2) };
    for (const method of ["compare", "compareBuild", "diff"])
      check(method, [a, b]);
    const r =
      ["^", "~", ">=", ">", "<=", "<", "="][pick(7)] +
      b +
      (pick(3) === 0 ? " || 2.x" : "");
    check("satisfies", [a, r, o]);
    check("validRange", [r, o]);
  }
});
test("public comparisons and selection", () => {
  for (const op of ["=", "==", "===", "!=", "!==", ">", ">=", "<", "<=", "bad"])
    check("cmp", ["1.2.3+one", op, "1.2.3+two"]);
  for (const name of ["sort", "rsort"])
    check(name, [["2.0.0", "1.0.0+a", "1.0.0+2", "1.0.0-rc"]]);
  for (const r of ["^1", "*", ">=2.0.0", "bad"])
    for (const method of ["maxSatisfying", "minSatisfying"])
      check(method, [["bad", "1.0.0", "1.2.4", "2.0.0-beta"], r]);
  const identityRange = new v.Range("^7");
  assert.equal(new v.Range(identityRange), identityRange);
  const a = new v.SemVer("v1.2.3-alpha.4+build.9");
  assert.equal(a.raw, "v1.2.3-alpha.4+build.9");
  assert.deepEqual(a.prerelease, ["alpha", 4]);
  assert.deepEqual(a.build, ["build", "9"]);
  assert.equal(a.version, "1.2.3-alpha.4");
  assert.equal(v.parse(a), a);
  assert.equal(v.valid("__proto__"), null);
  assert.equal(v.satisfies("1.0.0", "constructor"), false);
  assert.equal(v.valid("1.0.0-01"), null);
  assert.equal(v.valid("1.0.0-01", true), "1.0.0-1");
  assert.equal(v.valid("9007199254740992.0.0"), null);
  assert.equal(v.valid("1.2.3+" + "a".repeat(257)), null);
  assert.equal(v.validRange("1.2.3+" + "a".repeat(300)), "1.2.3");
  assert.throws(() => v.parse("bad", {}, true), TypeError);
});
test("public range mutation cannot poison convenience checks", () => {
  assert.equal(v.satisfies("1.2.3", "^1"), true);
  const range = new v.Range("^1");
  range.set[0][0].semver.major = 99;
  assert.equal(v.satisfies("1.2.3", "^1"), true);
  assert.equal(new v.Range("^1").test("1.2.3"), true);
  for (let i = 0; i < 600; i++)
    assert.equal(v.satisfies("1.0.0", "^2." + i), false);
  assert.equal(v.satisfies("1.2.3", "^1"), true);
  const publicRange = new v.Range("^9.1.0-rc");
  publicRange.set[0][0].semver.prerelease.push("mutated");
  publicRange.options.includePrerelease = true;
  assert.equal(v.validRange("^9.1.0-rc"), ">=9.1.0-rc <10.0.0-0");
  assert.equal(new v.Range("^9.1.0-rc").test("9.1.0-rc.1"), true);
  const valid = new v.Range("^1");
  assert.equal(valid.test("1.0.0-beta"), false);
  assert.equal(valid.test("1.2.0"), true);
  assert.equal(new v.Range("^1.0.0-rc").test("1.0.0-rc.1"), true);
});
test("generated checks completed", () =>
  console.log(checks + " semantic-version differential checks"));
