"use strict";
const fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process"),
  esbuild = require("esbuild"),
  own = require("../../packages/vcrypto-js/sha256.cjs"),
  up = require("crypto-js/sha256");
const app = "/Users/johnclyde/venti/ventimath-private";
if (!fs.existsSync(app + "/.git")) {
  console.log(
    "private caller snapshot unavailable; public caller fixtures still run",
  );
  process.exit(0);
}
let count = 0;
for (const [file, name] of [
  ["examAttemptAdapters.ts", "sheetVersionId"],
  ["paperReaderAttemptState.ts", "paperReaderVersion"],
]) {
  const source = execFileSync(
    "git",
    [
      "show",
      "origin/main:src/app/(control-panel)/apps/contests/components/views/" +
        file,
    ],
    { cwd: app, encoding: "utf8" },
  );
  const body = source.match(
    new RegExp("function " + name + "\\([\\s\\S]*?\\n\\}"),
  )?.[0];
  assert.ok(body, "Actual caller changed; inspect before adapting the test");
  const compiled = esbuild.transformSync("const MAX_VERSION_ID=500;\n" + body, {
    loader: "ts",
    target: "es2022",
  }).code;
  const run = (hash) =>
    new Function("SHA256", compiled + "\nreturn " + name + ";")(hash);
  const a = run(own),
    b = run(up);
  for (let n = 0; n <= 200; n++) {
    const ids = Array.from({ length: n }, (_, i) => "fixture-α-" + i);
    const args =
      name === "sheetVersionId"
        ? ["exam-fixture", ids]
        : [ids.map((id, i) => ({ label: String(i + 1), problem: { id } }))];
    assert.equal(a(...args), b(...args));
    count++;
  }
}
console.log(
  count +
    " unchanged actual contest-version caller comparisons pass; private code is neither written nor retained",
);
