"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, ".."),
  fixture = path.resolve(root, "../../scripts/date-fns-conformance");
const cases = [
  {
    name: "format calendar timestamp",
    make(file) {
      const f = require(file),
        d = new Date(2026, 10, 12, 13, 45);
      return () => f.format(d, "MMM d, yyyy · h:mm a");
    },
    validate(v) {
      assert.equal(v, "Nov 12, 2026 · 1:45 PM");
    },
  },
  {
    name: "parse picker date and time",
    make(file) {
      const f = require(file),
        d = new Date(2026, 10, 12);
      return () => f.parse("11/20/2026 01:45 PM", "P hh:mm aa", d);
    },
    validate(v) {
      assert.equal(v.getDate(), 20);
      assert.equal(v.getHours(), 13);
    },
  },
  {
    name: "parse calendar ISO instant",
    make(file) {
      const f = require(file);
      return () => f.parseISO("2026-11-12T13:45:30.123-08:00");
    },
    validate(v) {
      assert.equal(v.toISOString(), "2026-11-12T21:45:30.123Z");
    },
  },
  {
    name: "month-end calendar arithmetic",
    make(file) {
      const f = require(file),
        d = new Date(2024, 0, 31, 12);
      return () => f.addMonths(d, 1);
    },
    validate(v) {
      assert.equal(v.getMonth(), 1);
      assert.equal(v.getDate(), 29);
    },
  },
  {
    name: "relative notification time",
    make(file) {
      const f = require(file),
        a = new Date(2026, 10, 12, 12),
        b = new Date(2026, 10, 12, 15);
      return () => f.formatDistance(a, b, { addSuffix: true });
    },
    validate(v) {
      assert.equal(v, "about 3 hours ago");
    },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(path.join(fixture, "node_modules/date-fns")),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      "index.cjs",
      "arithmetic.cjs",
      "formatting.cjs",
      "parsing.cjs",
      "distance.cjs",
      "locale.cjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/date-fns-conformance/package-lock.json",
      "../../scripts/date-fns-conformance/node_modules/date-fns",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
