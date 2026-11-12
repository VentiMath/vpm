"use strict";
const { AdapterDateFns } = require("@mui/x-date-pickers/AdapterDateFns");
const { enUS } = require("date-fns/locale/en-US");
module.exports = () => {
  const adapter = new AdapterDateFns({ locale: enUS }),
    out = [];
  const dates = [
    new Date(2024, 1, 29, 12, 45),
    new Date(2026, 10, 1, 1, 30),
    new Date(2026, 11, 31, 23, 59),
  ];
  for (const d of dates) {
    for (const key of Object.keys(adapter.formats))
      out.push([
        key,
        adapter.format(d, key),
        adapter.expandFormat(adapter.formats[key]),
      ]);
    for (const f of [
      "getYear",
      "getMonth",
      "getDate",
      "getHours",
      "getMinutes",
      "getSeconds",
      "getMilliseconds",
      "getDaysInMonth",
      "getWeekNumber",
      "startOfWeek",
      "endOfWeek",
      "startOfMonth",
      "endOfMonth",
      "startOfYear",
      "endOfYear",
      "startOfDay",
      "endOfDay",
    ])
      out.push([f, adapter[f](d)]);
    out.push(
      ["weeks", adapter.getWeekArray(d)],
      [
        "years",
        adapter.getYearRange([new Date(2024, 0, 1), new Date(2028, 11, 31)]),
      ],
    );
    for (const pattern of [
      "P",
      "P hh:mm aa",
      "P HH:mm",
      "MMM d, yyyy",
      "yyyy-MM-dd",
    ])
      out.push([
        "parse",
        adapter.parse(adapter.formatByString(d, pattern), pattern),
      ]);
  }
  for (const s of [
    "",
    "02/29/2024",
    "02/30/2024",
    "13/12/2026",
    "11/01/2026 01:30 AM",
    "03/08/2026 02:30 AM",
  ])
    out.push([
      "parse",
      s,
      adapter.parse(s, s.includes(" ") ? "P hh:mm aa" : "P"),
    ]);
  return JSON.parse(JSON.stringify(out));
};
