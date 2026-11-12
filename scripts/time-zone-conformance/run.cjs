"use strict";
const assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process"),
  path = require("node:path"),
  cases = require("./cases.cjs");
(async () => {
  const H = await import("../../packages/vfull-ui-headless-calendar/index.js"),
    { CalendarApi } = await import(
      "../../packages/vfullcalendar-react/src/model.js"
    ),
    { checkCalendar } = await import("./checks.mjs");
  const count = checkCalendar(H, CalendarApi, cases, (ok, message) =>
    assert.ok(ok, message),
  );
  for (const row of cases)
    execFileSync(process.execPath, [path.join(__dirname, "local.cjs")], {
      env: { ...process.env, TZ: row.zone },
      stdio: "pipe",
      timeout: 20000,
    });
  const {
    onSchedule,
  } = require("../../packages/vfirebase-functions/lib/v2/providers/scheduler.js");
  const job = onSchedule(
    { schedule: "0 0 * * *", timeZone: "America/Vancouver" },
    () => {},
  );
  assert.equal(job.__endpoint.scheduleTrigger.timeZone, "America/Vancouver");
  console.log(
    count +
      " fixed-oracle calendar checks; " +
      cases.length +
      " isolated local-zone countdown checks; scheduler preserves Vancouver.",
  );
})().catch((e) => {
  console.error(e.stderr?.toString() || e);
  process.exitCode = 1;
});
