"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const worker = path.resolve(__dirname, "../hook-form-conformance/worker.cjs");
for (const form of ["vpm", "react-hook-form", "react-hook-form-app"]) {
  const run = (adapter, schema) =>
    JSON.parse(
      execFileSync(process.execPath, [worker, form], {
        encoding: "utf8",
        timeout: 60000,
        env: {
          ...process.env,
          NODE_ENV: "development",
          VRESOLVERS_ZOD: adapter,
          VZOD_ENTRY: schema,
        },
      }),
    );
  const baseline = run("", ""),
    actual = run(
      process.env.VRESOLVERS_ZOD ||
        path.resolve(__dirname, "../../packages/vhookform-resolvers/zod.cjs"),
      process.env.VZOD_ENTRY ||
        path.resolve(__dirname, "../../packages/vzod/index.cjs"),
    );
  assert.deepEqual(actual, baseline, form);
  console.log(
    actual.length +
      " React form snapshots match the application schema/adapter with " +
      form +
      ".",
  );
}
