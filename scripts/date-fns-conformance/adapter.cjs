"use strict";
const assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
if (!process.env.DATE_ADAPTER_ZONE) {
  require("./build.cjs");
  for (const zone of [
    "UTC",
    "America/Vancouver",
    "America/Los_Angeles",
    "Europe/Berlin",
    "Australia/Lord_Howe",
    "Asia/Kathmandu",
  ]) {
    const r = spawnSync(process.execPath, [__filename], {
      env: { ...process.env, DATE_ADAPTER_ZONE: zone, TZ: zone },
      encoding: "utf8",
    });
    process.stdout.write(r.stdout);
    process.stderr.write(r.stderr);
    assert.equal(r.status, 0, zone);
  }
  return;
}
const a = require("./node_modules/.vpm-date-fns/upstream/adapter.cjs")(),
  b = require("./node_modules/.vpm-date-fns/app/adapter.cjs")(),
  v = require("./node_modules/.vpm-date-fns/vpm/adapter.cjs")();
assert.deepEqual(v, a);
assert.deepEqual(v, b);
console.log(
  process.env.TZ + ": unchanged MUI adapter, " + v.length + " snapshots pass",
);
