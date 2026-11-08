"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto");
const upstream = require("react-themeable"),
  vpm = require(
    process.env.VPM_THEMEABLE_ENTRY || "../../packages/vreact-themeable",
  );
for (const [file, hash] of Object.entries(require("./upstream/hashes.json")))
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
      .digest("hex"),
    hash,
  );
const source = fs
  .readFileSync(path.join(__dirname, "upstream/index.test.js"), "utf8")
  .replace("import themeable from '../src';", "")
  .replace("import { expect } from 'chai';", "");
let tests = 0;
for (const themeable of [upstream, vpm])
  vm.runInNewContext(source, {
    themeable,
    expect: require("chai").expect,
    describe: (_n, fn) => fn(),
    it: (_n, fn) => {
      fn();
      tests++;
    },
  });
let seed = 62609,
  comparisons = 0;
const random = (n) =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n;
const symbol = Symbol("style");
for (let i = 0; i < 6000; i++) {
  const values =
    i % 3 === 0
      ? ["A", "B", "C", false, null, undefined]
      : [
          { color: "red", fontSize: 12, [symbol]: 1 },
          { color: "blue", opacity: 0.5 },
          false,
          null,
          "C",
        ];
  const theme = Object.assign(
    Object.create({ inherited: i % 2 ? "base" : { color: "green" } }),
    Object.fromEntries(values.map((v, j) => ["k" + j, v])),
  );
  const input =
    i % 3 === 2
      ? [
          theme,
          (...v) =>
            v
              .map((x) => (typeof x === "object" ? JSON.stringify(x) : x))
              .join("|"),
        ]
      : theme;
  const keys = [
    "k0",
    "k1",
    "k2",
    "k3",
    "k4",
    "k5",
    "inherited",
    "missing",
    false,
    null,
    undefined,
  ];
  const names = Array.from(
    { length: random(9) },
    () => keys[random(keys.length)],
  );
  assert.deepEqual(vpm(input)(i, ...names), upstream(input)(i, ...names));
  comparisons++;
}
console.log(
  `${tests / 2} unchanged upstream tests per implementation; ${comparisons} class/style/decorator differential cases pass.`,
);
require("./callers.cjs");
const addedSymbol = Symbol("added");
function mutatingGetter(api) {
  const style = {
    get first() {
      delete this.removed;
      this.added = 3;
      this[addedSymbol] = 4;
      return 1;
    },
    removed: 2,
  };
  return api({ x: style })("k", "x");
}
assert.deepEqual(mutatingGetter(vpm), mutatingGetter(upstream));
console.log(
  "Native enumerable-key snapshot semantics match, including getter additions/deletions.",
);
