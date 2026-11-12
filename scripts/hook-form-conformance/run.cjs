"use strict";
const assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process"),
  path = require("node:path");
const run = (name) =>
  JSON.parse(
    execFileSync(process.execPath, [path.join(__dirname, "worker.cjs"), name], {
      env: { ...process.env, NODE_ENV: "development" },
      encoding: "utf8",
      timeout: 60000,
    }),
  );
const vpm = run("vpm");
for (const name of ["react-hook-form", "react-hook-form-app"]) {
  const control = run(name);
  assert.deepEqual(vpm, control, name);
  console.log(
    vpm.length +
      " React form/step/reset/submission snapshots match " +
      name +
      ".",
  );
}
