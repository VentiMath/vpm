"use strict";
const assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process"),
  path = require("node:path");
for (const mode of ["development", "production"]) {
  const source = (file) =>
    `const a=require(${JSON.stringify(file)});const messages=[];console.warn=(...m)=>messages.push(m);a.warning(true,'silent');a.warning(false,'visible','code');let thrown;try{a.invariant(false,'invalid','code')}catch(e){thrown=e.message};a.warnOnce(true,'once');a.warnOnce(false,'once');a.warnOnce(false,'once');console.log(JSON.stringify({messages,thrown,warned:a.hasWarned('once')}))`;
  const run = (file) =>
    JSON.parse(
      execFileSync(process.execPath, ["-e", source(file)], {
        env: { ...process.env, NODE_ENV: mode },
        encoding: "utf8",
      }),
    );
  const control = run(require.resolve("motion-utils")),
    vpm = run(
      path.resolve(__dirname, "../../packages/vmotion-utils/index.cjs"),
    );
  assert.deepEqual(vpm, control);
}
let upstreamCalls = 0;
const up = require("motion-utils").memo(() => {
  upstreamCalls++;
});
up();
up();
assert.equal(upstreamCalls, 2);
let vpmCalls = 0;
const ours = require("../../packages/vmotion-utils/index.cjs").memo(() => {
  vpmCalls++;
});
ours();
ours();
assert.equal(vpmCalls, 1);
console.log(
  "Development/production diagnostics match; undefined memo result is now cached once.",
);
