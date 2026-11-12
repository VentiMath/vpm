"use strict";
// Expected instants come from the cited jurisdiction/IANA rules, not from the
// runtime under test or an upstream package using that same runtime database.
module.exports = [
  {
    zone: "America/Vancouver",
    days: [
      ["2025-11-02", "2025-11-03", 25],
      ["2026-03-08", "2026-03-09", 23],
      ["2026-11-01", "2026-11-02", 24],
    ],
    winter: ["2026-12-01T18:00:00Z", "2026-12-01T11:00:00Z", -420],
  },
  {
    zone: "Canada/Pacific",
    days: [
      ["2025-11-02", "2025-11-03", 25],
      ["2026-11-01", "2026-11-02", 24],
    ],
    winter: ["2026-12-01T18:00:00Z", "2026-12-01T11:00:00Z", -420],
  },
  {
    zone: "America/Los_Angeles",
    days: [
      ["2026-03-08", "2026-03-09", 23],
      ["2026-11-01", "2026-11-02", 25],
    ],
    winter: ["2026-12-01T18:00:00Z", "2026-12-01T10:00:00Z", -480],
  },
  {
    zone: "America/Dawson_Creek",
    days: [
      ["2025-11-02", "2025-11-03", 24],
      ["2026-03-08", "2026-03-09", 24],
      ["2026-11-01", "2026-11-02", 24],
    ],
    winter: ["2026-12-01T18:00:00Z", "2026-12-01T11:00:00Z", -420],
  },
  {
    zone: "Australia/Lord_Howe",
    days: [
      ["2026-04-05", "2026-04-06", 24.5],
      ["2026-10-04", "2026-10-05", 23.5],
    ],
    winter: ["2026-06-01T00:00:00Z", "2026-06-01T10:30:00Z", 630],
  },
];
