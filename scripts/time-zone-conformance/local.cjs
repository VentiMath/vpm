"use strict";
const assert = require("node:assert/strict"),
  moment = require("../../packages/vmoment"),
  row = require("./cases.cjs").find((x) => x.zone === process.env.TZ);
const stamp = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];
for (const [start, end, hours] of row.days) {
  const a = moment(start),
    b = a.clone().add(1, "day");
  assert.deepEqual(stamp(b.toDate()), end.split("-").map(Number));
  assert.equal(
    b.diff(a, "hours", true),
    hours,
    row.zone + " calendar-day length",
  );
  assert.equal(b.diff(a, "days", true), 1);
  assert.equal(a.clone().add(24, "hours").valueOf() - a.valueOf(), 86400000);
  // A bare date is local civil midnight, never a UTC date-only parse.
  assert.equal(a.toDate().getHours(), 0);
  assert.equal(a.toDate().getDate(), Number(start.slice(-2)));
}
const [instant, wall, offset] = row.winter,
  date = new Date(instant);
assert.equal(
  date.getTimezoneOffset(),
  -offset,
  row.zone + " native Date data is stale; update the runtime/system tzdata",
);
assert.equal(date.getHours(), Number(wall.slice(11, 13)));
assert.equal(date.getMinutes(), Number(wall.slice(14, 16)));
console.log(row.zone + ": " + row.days.length + " local calendar-day cases");
