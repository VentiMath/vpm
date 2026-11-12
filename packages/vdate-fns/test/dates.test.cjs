"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  f = require(".."),
  { spawnSync } = require("node:child_process");
test("operations clone inputs and clamp leap/month ends", () => {
  const d = new Date(2024, 0, 31, 12),
    before = +d;
  assert.equal(f.addMonths(d, 1).getDate(), 29);
  assert.equal(f.addYears(new Date(2024, 1, 29), 1).getDate(), 28);
  assert.equal(f.setMonth(d, 1).getDate(), 29);
  assert.equal(+d, before);
  assert.notEqual(f.addDays(d, 0), d);
  assert.ok(Number.isNaN(+f.setYear(new Date(NaN), 2026)));
});
test("ISO rejects impossible dates, clock fields and offsets", () => {
  for (const s of [
    "2024-02-30",
    "2023-366",
    "2026-W00-1",
    "2026-01-01T24:01",
    "2026-01-01T12:60Z",
    "2026-01-01T12:00+00:99",
  ])
    assert.ok(Number.isNaN(+f.parseISO(s)), s);
  assert.equal(f.parseISO("0099-01-01").getFullYear(), 99);
  assert.equal(
    f.parseISO("2024-02-29T12:30:00+05:45").toISOString(),
    "2024-02-29T06:45:00.000Z",
  );
});
test("picker parsing rejects overflow instead of silently changing a selected date", () => {
  const ref = new Date(2026, 6, 1);
  for (const [s, p] of [
    ["02/30/2026", "P"],
    ["13/12/2026", "P"],
    ["13 PM", "h a"],
    ["0", "e"],
    ["7:65 PM", "h:mm a"],
    ["12/10/2026 junk", "P"],
  ])
    assert.ok(Number.isNaN(+f.parse(s, p, ref)), s);
  assert.equal(f.parse("00", "yy", ref).getFullYear(), 2000);
  assert.equal(+f.parse("literal", "'literal'", ref), +ref);
});
test("quoted formats and unsupported locales/tokens do not silently misformat", () => {
  const d = new Date(2026, 10, 12, 13, 30);
  assert.equal(f.format(d, "'it''s' MMM d, yyyy"), "it's Nov 12, 2026");
  assert.throws(() => f.format(d, "YYYY"), RangeError);
  assert.throws(() => f.format(d, "P", { locale: { code: "fr" } }), RangeError);
  assert.throws(() => f.format(new Date(NaN), "P"), RangeError);
});
test("calendar days and elapsed hours diverge at DST and follow current BC data", () => {
  for (const zone of ["America/Los_Angeles", "America/Vancouver"]) {
    const code = `const a=require(${JSON.stringify(require.resolve(".."))}),assert=require('node:assert/strict');const start=new Date(2026,2,7,12);assert.equal(a.addDays(start,1).getHours(),12);assert.equal(a.addHours(start,24).getHours(),13);const nov=new Date(2026,9,31,12);assert.equal(a.addDays(nov,1).getHours(),12);assert.equal((a.addDays(nov,1)-nov)/3600000,${zone === "America/Vancouver" ? 24 : 25});`;
    const r = spawnSync(process.execPath, ["-e", code], {
      env: { ...process.env, TZ: zone },
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
  }
});
test("relative display uses the clock at each invocation and suffix direction", () => {
  const now = Date.now;
  try {
    Date.now = () => Date.UTC(2026, 10, 12, 12);
    assert.equal(
      f.formatDistanceToNowStrict(Date.now() + 60000, { addSuffix: true }),
      "in 1 minute",
    );
    Date.now = () => Date.UTC(2026, 10, 12, 13);
    assert.equal(
      f.formatDistanceToNowStrict(Date.UTC(2026, 10, 12, 12), {
        addSuffix: true,
      }),
      "1 hour ago",
    );
  } finally {
    Date.now = now;
  }
});

test("signed years and pre-epoch timestamp formats retain their sign", () => {
  const d = new Date(0);
  d.setFullYear(-1, 0, 1);
  assert.ok(f.formatISO(d).startsWith("-0001-01-01T"));
  assert.equal(f.format(new Date(-1000), "t T"), "-1 -1000");
});
