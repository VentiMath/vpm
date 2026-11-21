"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const { execFileSync } = require("node:child_process");
const modules = path.join(__dirname, "node_modules");
const cwd = fs.mkdtempSync(path.join(modules, ".codec-"));
try {
  const scope = path.join(cwd, "node_modules", "@jridgewell");
  fs.mkdirSync(scope, { recursive: true });
  const codec =
    process.env.VPM_SOURCEMAP_CODEC ||
    path.resolve(__dirname, "../../packages/vsourcemap-codec");
  for (const name of ["gen-mapping", "trace-mapping"])
    fs.cpSync(path.join(modules, "@jridgewell", name), path.join(scope, name), {
      recursive: true,
    });
  fs.symlinkSync(codec, path.join(scope, "sourcemap-codec"));
  const script = `
    import assert from "node:assert/strict";
    import {GenMapping, addMapping, toEncodedMap, fromMap} from "@jridgewell/gen-mapping";
    import {TraceMap, originalPositionFor, encodedMappings, decodedMappings} from "@jridgewell/trace-mapping";
    import {encode, decode} from "@jridgewell/sourcemap-codec";
    import {createRequire} from "node:module";
    const require = createRequire(import.meta.url);
    assert.equal(require("@jridgewell/sourcemap-codec").encode, encode);
    const map = new GenMapping({file:"app.js"});
    addMapping(map,{generated:{line:2,column:8},source:"practice.tsx",original:{line:40,column:3},name:"practiceTime"});
    addMapping(map,{generated:{line:2,column:0},source:"signup.tsx",original:{line:1,column:1}});
    addMapping(map,{generated:{line:3,column:3}});
    const result = toEncodedMap(map), trace=new TraceMap(result);
    assert.deepEqual(decode(result.mappings), [[], [[0,1,0,1],[8,0,39,3,0]], [[3]]]);
    assert.deepEqual(originalPositionFor(trace,{line:2,column:9}),{line:40,column:3,source:"practice.tsx",name:"practiceTime"});
    assert.equal(originalPositionFor(trace,{line:3,column:8}).source,null);
    assert.deepEqual(decodedMappings(trace), decode(result.mappings));
    assert.equal(encodedMappings(new TraceMap({...result,mappings:decode(result.mappings)})),result.mappings);
    assert.deepEqual(toEncodedMap(fromMap(result)),result);
    console.log("Unchanged gen-mapping and trace-mapping passed generation, tracing and re-encoding.");
  `;
  fs.writeFileSync(path.join(cwd, "probe.mjs"), script);
  execFileSync(process.execPath, ["probe.mjs"], { cwd, stdio: "inherit" });
} finally {
  fs.rmSync(cwd, { recursive: true, force: true });
}
