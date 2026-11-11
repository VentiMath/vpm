"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  moment = require(process.env.VMOMENT_ENTRY || "..");
test("input Dates, clones and returned Dates have independent ownership", () => {
  const date = new Date(1000),
    a = moment(date),
    b = a.clone();
  date.setTime(0);
  b.add(1, "seconds");
  a.toDate().setTime(9000);
  assert.equal(a.valueOf(), 1000);
  assert.equal(b.valueOf(), 2000);
});
test("countdown fields preserve elapsed time and signed truncation", () => {
  const duration = moment.duration(90061, "seconds");
  assert.equal(duration.asDays(), 90061 / 86400);
  assert.deepEqual(
    [duration.hours(), duration.minutes(), duration.seconds()],
    [1, 1, 1],
  );
  assert.equal(moment(100).diff(200, "seconds"), 0);
  assert.equal(Object.is(moment(100).diff(200, "seconds"), -0), false);
});
test("invalid calendar input does not normalize into another day", () => {
  for (const value of [
    "2026-02-29",
    "2024-04-31",
    "2026-00-01",
    "2026-11-01T24:01:00",
    "2026-11-01T01:00:00+99:99",
    "July 1, 2071",
    null,
    Infinity,
  ]) {
    const date = moment(value);
    assert.equal(date.isValid(), false, String(value));
    assert.equal(date.toISOString(), null);
    assert.ok(Number.isNaN(date.diff(moment(), "seconds")));
  }
});
test("zero day addition preserves the second repeated-hour instant", () => {
  const value = Date.parse("2026-11-01T01:30:00-08:00");
  assert.equal(moment(value).add(0, "days").valueOf(), value);
});
test("ISO offsets and twenty-four-hour midnight retain exact instants", () => {
  assert.equal(
    moment("2026-11-01T01:30:00-08:00").valueOf(),
    Date.parse("2026-11-01T09:30:00Z"),
  );
  assert.equal(
    moment("2026-01-01T24:00:00Z").toISOString(),
    "2026-01-02T00:00:00.000Z",
  );
});
test("unsupported calendar formats and units cannot silently change meaning", () => {
  assert.throws(() => moment().add(1, "months"), /Unsupported/);
  assert.throws(() => moment.duration(1, "years"), /Unsupported/);
  assert.throws(() => moment().diff(moment(), "quarters"), /Unsupported/);
});
test("clock hook is read on each construction", () => {
  const old = moment.now;
  try {
    let t = 100;
    moment.now = () => t;
    assert.equal(moment().valueOf(), 100);
    t = 200;
    assert.equal(moment().valueOf(), 200);
  } finally {
    moment.now = old;
  }
});
test("invalid durations retain NaN, rather than showing plausible fields", () => {
  const d = moment.duration(NaN, "seconds");
  assert.equal(d.isValid(), false);
  assert.ok(Number.isNaN(d.seconds()));
  assert.ok(Number.isNaN(d.asDays()));
});

test("Dates from another realm preserve their exact instant", () => {
  const value = require("node:vm").runInNewContext("new Date(123456)");
  assert.equal(moment(value).valueOf(), 123456);
});
