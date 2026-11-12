"use strict";
const assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
if (!process.env.DATE_FNS_ZONE) {
  for (const zone of [
    "UTC",
    "America/Vancouver",
    "America/Los_Angeles",
    "Europe/Berlin",
    "Australia/Lord_Howe",
    "Asia/Kathmandu",
  ]) {
    const run = spawnSync(process.execPath, [__filename], {
      env: { ...process.env, DATE_FNS_ZONE: zone, TZ: zone },
      encoding: "utf8",
    });
    process.stdout.write(run.stdout);
    process.stderr.write(run.stderr);
    assert.equal(run.status, 0, zone);
  }
  return;
}
const v = require("../../packages/vdate-fns"),
  controls = [require("date-fns"), require("date-fns-app")];
let count = 0,
  failures = [];
function compare(name, args) {
  for (let k = 0; k < controls.length; k++) {
    let a, b;
    try {
      a = v[name](...args);
    } catch (e) {
      a = { error: e.constructor.name };
    }
    try {
      b = controls[k][name](...args);
    } catch (e) {
      b = { error: e.constructor.name };
    }
    try {
      assert.deepEqual(a, b);
    } catch {
      if (failures.length < 15)
        failures.push({ name, args, v: a, upstream: b, control: k });
    }
    count++;
  }
}
const dates = [
  new Date(NaN),
  new Date(0),
  new Date(2024, 1, 29, 15, 42, 13, 451),
  new Date(2026, 0, 31, 23, 59, 59, 999),
  new Date(2026, 10, 1, 1, 30),
  new Date(2026, 2, 8, 1, 30),
  new Date(2026, 11, 31, 12),
  new Date(2027, 0, 1, 12),
  new Date(2025, 0, 1, 12),
];
for (let i = 0; i < 80; i++)
  dates.push(
    new Date(
      2000 + (i % 30),
      (i * 7) % 12,
      1 + ((i * 17) % 28),
      i % 24,
      i % 60,
      i % 60,
      (i * 11) % 1000,
    ),
  );
const unary = [
  "getDate",
  "getHours",
  "getMinutes",
  "getMonth",
  "getSeconds",
  "getMilliseconds",
  "getYear",
  "getDaysInMonth",
  "isValid",
  "startOfDay",
  "endOfDay",
  "startOfMonth",
  "endOfMonth",
  "startOfYear",
  "endOfYear",
  "startOfWeek",
  "endOfWeek",
  "getWeek",
];
for (const d of dates) {
  for (const f of unary) compare(f, [d]);
  for (const f of [
    "addDays",
    "addWeeks",
    "addMonths",
    "addYears",
    "addHours",
    "addMinutes",
    "addSeconds",
  ])
    for (const n of [-14, -1, 0, 1, 2, 12, NaN]) compare(f, [d, n]);
  for (const [f, n] of [
    ["setYear", 2028],
    ["setMonth", 1],
    ["setMonth", 14],
    ["setDate", 31],
    ["setHours", 23],
    ["setMinutes", 45],
    ["setSeconds", 59],
    ["setMilliseconds", 123],
  ])
    compare(f, [d, n]);
  for (const format of ["extended", "basic"])
    for (const representation of ["complete", "date", "time"])
      compare("formatISO", [d, { format, representation }]);
  compare("sub", [
    d,
    {
      years: 1,
      months: 2,
      weeks: 3,
      days: 4,
      hours: 5,
      minutes: 6,
      seconds: 7,
    },
  ]);
  for (const weekStartsOn of [0, 1, 6])
    for (const firstWeekContainsDate of [1, 4, 7])
      compare("getWeek", [d, { weekStartsOn, firstWeekContainsDate }]);
}
const patterns = [
  "MMM d, yyyy",
  "MMM d, yyyy · h:mm a",
  "EEEE, MMMM d, y - hh:mm a",
  "LLL d",
  "LLL d, yyyy",
  "PP",
  "MMM dd yy, h:mm",
  "yyyy-MM-dd",
  "MMM d",
  "HH:mm",
  "MMM dd, y",
  "MMM dd, h:mm a",
  "eeee",
  "dd",
  "MMMM",
  "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
  "P",
  "PPP",
  "PPPP",
  "p",
  "pp",
  "ppp",
  "pppp",
  "Pp",
  "PPpp",
  "PPPppp",
  "PPPPpppp",
  "a aa aaa aaaa aaaaa",
  "E EE EEE EEEE EEEEE EEEEEE",
  "c cc ccc cccc ccccc cccccc",
  "y yy yyy yyyy",
  "do",
  "LLLL",
  "'on' EEEE 'at' h:mm a",
  "'it''s' MMMM",
];
for (const d of dates)
  for (const pattern of patterns) compare("format", [d, pattern]);
const parsePatterns = [
  "yyyy-MM-dd",
  "P",
  "PP",
  "PPP",
  "PPPP",
  "MMM d, yyyy",
  "MM/dd/yyyy hh:mm aa",
  "MM/dd/yyyy HH:mm",
  "h:mm a",
  "HH:mm",
  "hh:mm:ss aa",
  "yyyy",
  "yy",
  "MMMM",
  "MMM",
  "MM",
  "do",
  "EEEE",
  "eee",
  "ii",
  "m",
  "ss",
  "aaaa",
];
for (const d of dates.slice(1))
  for (const pattern of parsePatterns) {
    const input = controls[0].format(d, pattern);
    compare("parse", [input, pattern, new Date(2026, 6, 14, 13, 15, 17, 191)]);
  }
for (const input of [
  "2024-02-29",
  "2024-02-31",
  "2024-00-12",
  "2024-13-01",
  "2024-366",
  "2023-366",
  "2024-W01-1",
  "2026-W53-7",
  "2024",
  "2024-11",
  "20241112T120000Z",
  "2024-11-12T24:00:00",
  "2024-11-12T24:00:01",
  "2024-11-12T12:30:45.123Z",
  "2024-11-12T12:30:45+05:45",
  "2024-11-12T12,5",
  "2024-11-12T12:30,5",
  "2024-11-12T12:30:45.999",
  "oops",
  "2026-01-01T00:00:00+00:99",
  "+012345-01-01",
  "0099-01-01",
])
  compare("parseISO", [input]);
const ref = new Date(2026, 10, 12, 15, 4, 5);
for (const delta of [
  -64000000, -31536000, -5184000, -2592000, -86400, -3600, -30, 0, 4, 5, 9, 10,
  19, 20, 29, 30, 39, 40, 59, 60, 89, 90, 120, 1800, 2699, 2700, 3599, 3600,
  5400, 86400, 129600, 2592000, 3888000, 5184000, 31536000, 39420000, 47304000,
  63072000,
]) {
  for (const addSuffix of [false, true])
    for (const includeSeconds of [false, true])
      compare("formatDistance", [
        new Date(+ref + delta * 1000),
        ref,
        { addSuffix, includeSeconds },
      ]);
  for (const unit of [
    undefined,
    "second",
    "minute",
    "hour",
    "day",
    "month",
    "year",
  ])
    for (const roundingMethod of ["round", "floor", "ceil"])
      compare("formatDistanceStrict", [
        new Date(+ref + delta * 1000),
        ref,
        { unit, roundingMethod, addSuffix: true },
      ]);
}
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else
  console.log(
    process.env.TZ + ": " + count + " comparisons pass against 4.4.0 and 4.1.0",
  );
