"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
require("../../../scripts/check-bun.cjs");
const root = path.resolve(__dirname, "..");
const cases = [
  {
    name: "parse local countdown end date",
    make(file) {
      const moment = require(file);
      return () => moment("2071-07-28").valueOf();
    },
    validate(value) {
      assert.equal(value, new Date(2071, 6, 28).valueOf());
    },
  },
  {
    name: "create default fifteen-day deadline",
    make(file) {
      const moment = require(file);
      moment.now = () => 1793521800123;
      return () => moment().add(15, "days").valueOf();
    },
    validate(value) {
      const d = new Date(1793521800123);
      d.setDate(d.getDate() + 15);
      assert.equal(value, d.valueOf());
    },
  },
  {
    name: "FuseCountdown tick and fields",
    make(file) {
      const moment = require(file);
      moment.now = () => 1793521800123;
      const end = moment(1793611861123);
      return () => {
        const d = moment.duration(end.diff(moment(), "seconds"), "seconds");
        return [
          Number(d.asDays().toFixed(0)),
          d.hours(),
          d.minutes(),
          d.seconds(),
        ];
      };
    },
    validate(value) {
      assert.deepEqual(value, [1, 1, 1, 1]);
    },
  },
  {
    name: "duration construction and fields",
    make(file) {
      const moment = require(file);
      return () => {
        const d = moment.duration(90061, "seconds");
        return [d.hours(), d.minutes(), d.seconds()];
      };
    },
    validate(value) {
      assert.deepEqual(value, [1, 1, 1]);
    },
  },
];
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: require.resolve(
      "../../../scripts/moment-conformance/node_modules/moment",
    ),
    vpm: path.join(root, "index.cjs"),
    cases,
    files: [
      "index.cjs",
      "index.mjs",
      "package.json",
      "PROVENANCE.json",
      "bench/run.cjs",
      "../../scripts/moment-conformance/package-lock.json",
      "../../scripts/moment-conformance/node_modules/moment",
    ],
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
