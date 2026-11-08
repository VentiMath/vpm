"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto");
const vpm = require(
    process.env.VPM_SECTION_ENTRY || "../../packages/vsection-iterator",
  ),
  upstream = require("section-iterator");
for (const [name, hash] of Object.entries(require("./upstream/hashes.json")))
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", name)))
      .digest("hex"),
    hash,
  );
const original = fs.readFileSync(
  path.join(__dirname, "upstream/index.test.js"),
  "utf8",
);
// The archived tests stay byte-identical. Only their two imports are supplied
// by this adapter; the suite's synchronous before hooks run at group entry.
const source = original
  .replace("import { expect } from 'chai';", "")
  .replace("import createSectionIterator from './index';", "");
let tests = 0;
for (const create of [upstream, vpm])
  vm.runInNewContext(source, {
    expect: require("chai").expect,
    createSectionIterator: create,
    describe: (_name, fn) => fn(),
    before: (fn) => fn(),
    it: (_name, fn) => {
      fn();
      tests++;
    },
  });
let seed = 29109,
  comparisons = 0;
const random = (n) =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) % n;
for (let trial = 0; trial < 2100; trial++) {
  const multiSection = trial >= 100,
    data = multiSection
      ? Array.from({ length: random(40) }, () => random(7))
      : trial;
  const a = upstream({ data, multiSection }),
    b = vpm({ data, multiSection });
  const positions = [[null, null]];
  if (multiSection) {
    for (let s = 0; s < data.length; s++)
      for (let i = 0; i < data[s]; i++) positions.push([s, i]);
  } else for (let i = 0; i < data; i++) positions.push([null, i]);
  for (const p of positions)
    for (const method of ["next", "prev", "isLast"]) {
      assert.deepEqual(
        b[method](p),
        a[method](p),
        JSON.stringify({ data, p, method }),
      );
      comparisons++;
    }
}
console.log(
  `${tests / 2} unchanged upstream tests per implementation and ${comparisons} valid-position differential calls pass.`,
);
require("./callers.cjs");
