"use strict";
const assert = require("node:assert/strict"),
  vpm = require(process.env.VMOMENT_ENTRY || "../../packages/vmoment");
let count = 0;
for (const name of ["moment", "moment-app"]) {
  const control = require("./node_modules/" + name);
  control.suppressDeprecationWarnings = true;
  for (const value of [
    "2071-07-28",
    "2026-11-01",
    "2026-03-08T01:30:00",
    "2026-03-08T02:30:00",
    "2026-11-01T01:30:00",
    "2024-02-29T12:30:14.123Z",
    "2026-11-01T01:30:00-07:00",
    "2026-11-01T01:30:00-08:00",
    "0001-01-01",
    null,
    NaN,
    0,
    1793521800000,
    new Date(2026, 3, 1),
  ]) {
    for (const days of [-15, -1.5, 0, 1, 1.5, 15, 365]) {
      const a = vpm(value).add(days, "days"),
        b = control(value).add(days, "days");
      assert.equal(a.valueOf(), b.valueOf(), String(value));
      assert.equal(a.isValid(), b.isValid());
      count++;
    }
  }
  for (let seconds = -100000; seconds <= 100000; seconds += 137) {
    const a = vpm.duration(seconds, "seconds"),
      b = control.duration(seconds, "seconds");
    for (const method of [
      "asDays",
      "asHours",
      "asMinutes",
      "asSeconds",
      "hours",
      "minutes",
      "seconds",
    ])
      assert.equal(a[method](), b[method](), method + " " + seconds);
    count++;
  }
  for (const a of [
    "2026-03-08T00:00:00",
    "2026-03-09T00:00:00",
    "2026-11-01T00:00:00",
    "2026-11-02T00:00:00",
  ])
    for (const b of ["2026-03-08T00:00:00", "2026-11-01T00:00:00"])
      for (const unit of ["seconds", "days", "hours"])
        for (const floating of [true, false]) {
          assert.equal(
            vpm(a).diff(vpm(b), unit, floating),
            control(a).diff(control(b), unit, floating),
          );
          count++;
        }
  for (const remaining of [
    -1001,
    -999,
    0,
    999,
    1000,
    90061000,
    86400000 * 16 - 1,
  ]) {
    const tick = (m) => {
      const end = m(1793521800000 + remaining),
        diff = end.diff(m(), "seconds");
      if (diff < 0) return "complete";
      const d = m.duration(diff, "seconds");
      return [
        Number(d.asDays().toFixed(0)),
        d.hours(),
        d.minutes(),
        d.seconds(),
      ];
    };
    vpm.now = control.now = () => 1793521800000;
    assert.deepEqual(tick(vpm), tick(control));
    count++;
  }
  vpm.now = control.now = () => 1793521800123;
  assert.equal(vpm().valueOf(), control().valueOf());
  assert.equal(vpm.isMoment(control()), true);
  assert.equal(control.isMoment(vpm()), true);
}
vpm.now = () => Date.now();
console.log(
  count +
    " current/app date, duration and DST comparisons pass in " +
    (process.env.TZ || "local timezone") +
    ".",
);
