"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process");
for (const row of fs
  .readFileSync(__dirname + "/upstream/SHA256SUMS", "utf8")
  .trim()
  .split("\n")) {
  const [hash, file] = row.split("  ");
  require("node:assert/strict").equal(
    require("node:crypto")
      .createHash("sha256")
      .update(fs.readFileSync(__dirname + "/upstream/" + file))
      .digest("hex"),
    hash,
  );
}
const folder = path.join(__dirname, "upstream/test");
let failed = 0,
  assertions = 0;
for (const file of fs.readdirSync(folder).filter((f) => f.endsWith(".ts"))) {
  const run = spawnSync(process.execPath, [folder + "/" + file], {
    encoding: "utf8",
    timeout: 20000,
    maxBuffer: 2e6,
    env: { ...process.env, TAP: "1" },
  });
  const output = (run.stdout || "") + (run.stderr || "");
  assertions += (output.match(/^\s*ok \d+/gm) || []).length;
  console.log(file + ": " + (run.status === 0 ? "pass" : "FAIL"));
  if (run.status !== 0) {
    failed++;
    console.log(output);
    if (run.error) console.error(run.error.message);
  }
}
console.log(`${assertions} passing assertions; ${failed} failing files.`);
if (failed) process.exitCode = 1;
