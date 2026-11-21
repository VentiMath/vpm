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
    "Pass the unmodified trace-mapping.test.ts from the trace-mapping/0.3.31 tag",
  );
const root = path.resolve(__dirname, "../../packages");
const spec = fs
  .readFileSync(file, "utf8")
  .replace(
    "'../src/trace-mapping'",
    JSON.stringify(pathToFileURL(root + "/vtrace-mapping/index.mjs").href),
  )
  .replace(
    "'@jridgewell/sourcemap-codec'",
    JSON.stringify(pathToFileURL(root + "/vsourcemap-codec/index.mjs").href),
  );
const suite = `let count=0;
function describe(_name,fn){fn()}
function it(name,fn){try{fn();count++}catch(error){throw Error(name,{cause:error})}}
${spec}
console.log(count+" upstream flat-map tests passed.");`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "trace-contract-"));
try {
  const out = path.join(dir, "public-tests.mts");
  fs.writeFileSync(out, suite);
  execFileSync(process.execPath, [out], { stdio: "inherit" });
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
