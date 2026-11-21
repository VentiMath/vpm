"use strict";
// Both supported runtimes can run the original public TypeScript assertions.
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { execFileSync } = require("node:child_process"),
  { pathToFileURL } = require("node:url");
const file = process.argv[2];
const target = file && path.basename(file, ".test.ts");
if (!["gen-mapping", "trace-mapping", "remapping"].includes(target))
  throw Error(
    "Pass the target release's gen-mapping, trace-mapping or remapping .test.ts file",
  );
const root = path.resolve(__dirname, "../../packages");
const spec = fs
  .readFileSync(file, "utf8")
  .replace(
    (target === "remapping" ? "'../../src/" : "'../src/") + target + "'",
    JSON.stringify(pathToFileURL(root + "/v" + target + "/index.mjs").href),
  )
  .replace("import { type EncodedSourceMap } from '../../src/types';", "")
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

if (target === "remapping") {
  const compose = require(root + "/vremapping");
  const control = require("@jridgewell/remapping");
  const assert = require("node:assert/strict");
  const samples = path.resolve(path.dirname(file), "../samples");
  for (const [sample, entry] of [
    ["transpile-concat-hires", "bundle.js.map"],
    ["transpile-concat-lowres", "bundle.js.map"],
    ["transpile-rollup", "bundle.js.map"],
    ["transpile-minify", "helloworld.min.js.map"],
  ]) {
    const files = path.join(samples, sample, "files");
    const load = (source) => {
      const next = path.join(files, source + ".map");
      return fs.existsSync(next) ? fs.readFileSync(next, "utf8") : null;
    };
    const input = fs.readFileSync(path.join(files, entry), "utf8");
    assert.equal(
      compose(input, load).toString(),
      control(input, load).toString(),
      sample,
    );
  }
  console.log("All four upstream build fixture maps serialize identically.");
}
