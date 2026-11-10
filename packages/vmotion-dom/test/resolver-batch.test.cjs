"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  api = require(process.env.VMOTION_DOM_ENTRY || "../index.cjs");
test("single resolver reads preserve measurement batching and defer new read work", () => {
  const seen = [];
  const later = new api.KeyframeResolver(
    [0, 1],
    () => seen.push("later"),
    "x",
    undefined,
    undefined,
    true,
  );
  class Measured extends api.KeyframeResolver {
    readKeyframes() {
      seen.push("read");
      super.readKeyframes();
      this.needsMeasurement = true;
      later.scheduleResolve();
    }
    prepareMeasurement() {
      seen.push("prepare");
    }
    measureInitialState() {
      seen.push("start");
    }
    measureEndState() {
      seen.push("end");
    }
    restore() {
      seen.push("restore");
    }
  }
  const r = new Measured(
    [0, 1],
    () => seen.push("complete"),
    "x",
    undefined,
    undefined,
    true,
  );
  r.scheduleResolve();
  api.flushKeyframeResolvers();
  assert.deepEqual(seen, [
    "read",
    "prepare",
    "start",
    "end",
    "restore",
    "complete",
  ]);
  api.flushKeyframeResolvers();
  assert.equal(seen.at(-1), "later");
  r.cancel();
  r.resume();
  api.flushKeyframeResolvers();
  assert.equal(seen.filter((x) => x === "read").length, 1);
});
test("single resolver failures preserve falsy errors and subsequent work", () => {
  class Broken extends api.KeyframeResolver {
    readKeyframes() {
      throw null;
    }
  }
  const bad = new Broken([0, 1], () => {}, "x", undefined, undefined, true);
  bad.scheduleResolve();
  let caught = false;
  try {
    api.flushKeyframeResolvers();
  } catch (e) {
    caught = true;
    assert.equal(e, null);
  }
  assert.equal(caught, true);
  let calls = 0;
  const later = new api.KeyframeResolver(
    [0, 1],
    () => calls++,
    "x",
    undefined,
    undefined,
    true,
  );
  const first = new api.KeyframeResolver(
    [0, 1],
    () => {
      later.scheduleResolve();
      api.flushKeyframeResolvers();
    },
    "x",
    undefined,
    undefined,
    true,
  );
  first.scheduleResolve();
  api.flushKeyframeResolvers();
  assert.equal(calls, 1);
});
