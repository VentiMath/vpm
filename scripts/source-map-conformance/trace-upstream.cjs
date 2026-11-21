"use strict";
// Both supported runtimes can execute .mts directly. Only redirect the two package imports.
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { execFileSync } = require("node:child_process"),
  { pathToFileURL } = require("node:url");
const file = process.argv[2];
if (!file)
  throw Error(
    "Pass the original gen-mapping.test.ts or trace-mapping.test.ts from its target release",
  );
const target =
  path.basename(file) === "gen-mapping.test.ts"
    ? "gen-mapping"
    : "trace-mapping";
const root = path.resolve(__dirname, "../../packages");
const spec = fs
  .readFileSync(file, "utf8")
  .replace(
    "'../src/" + target + "'",
    JSON.stringify(pathToFileURL(root + "/v" + target + "/index.mjs").href),
  )
  .replace(
    "'@jridgewell/sourcemap-codec'",
    JSON.stringify(pathToFileURL(root + "/vsourcemap-codec/index.mjs").href),
  );
const suite = `let count=0;
function describe(_name,fn){fn()}
function it(name,fn){try{fn();count++}catch(error){throw Error(name,{cause:error})}}
${spec}
console.log(count+" upstream ${target} tests passed.");`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "trace-contract-"));
try {
  const out = path.join(dir, "public-tests.mts");
  fs.writeFileSync(out, suite);
  execFileSync(process.execPath, [out], { stdio: "inherit" });
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
