"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { createHash } = require("node:crypto");
const vpm = require(
  process.env.VPM_CSSJANUS_ENTRY || "../../packages/vcssjanus",
);
for (const [f, h] of Object.entries(require("./upstream/hashes.json")))
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", f)))
      .digest("hex"),
    h,
  );
const data = require("./upstream/data.json");
let count = 0,
  failed = [];
for (const [name, group] of Object.entries(data))
  for (const [input, expected] of group.cases) {
    const args = group.args || [group.options || {}];
    for (const [label, api] of [
      ["vpm", vpm],
      ["current", require("cssjanus")],
      ["app", require("cssjanus-app")],
    ]) {
      if (
        label === "app" &&
        name ===
          "do not flip percentages inside functions in the background shorthand"
      )
        continue;
      try {
        assert.equal(
          api.transform(input, ...args),
          expected === undefined ? input : expected,
        );
        if (group.roundtrip ?? expected !== undefined)
          assert.equal(api.transform(expected, ...args), input);
      } catch (e) {
        failed.push({
          label,
          name,
          input,
          expected,
          actual: api.transform(input, ...args),
          error: e.message,
        });
      }
    }
    count++;
  }
if (failed.length) {
  console.log(JSON.stringify(failed, null, 2));
  process.exitCode = 1;
} else
  console.log(
    count +
      " public fixture cases and roundtrips pass; app control excludes six 2.3.1 background fixes.",
  );
const load = require("./load.cjs"),
  cases = require("./cases.cjs");
const entry =
  process.env.VPM_CSSJANUS_ENTRY ||
  path.resolve(__dirname, "../../packages/vcssjanus");
let callers = 0;
for (const stylis of [require("stylis"), require("../../packages/vstylis")]) {
  const current = load(require.resolve("cssjanus"), stylis),
    replacement = load(entry, stylis);
  for (const css of cases)
    for (const rtl of [true, false]) {
      if (css.includes(".safe:before") && rtl) {
        assert.match(replacement(css, rtl), /content:"left;right:\{\}"/);
        assert.match(current(css, rtl), /content:"right;right:\{\}"/);
      } else assert.equal(replacement(css, rtl), current(css, rtl));
      callers++;
    }
}
let seed = 27491;
const random = (n) =>
  ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) >>> 8) % n;
const decl = [
  "left:12px",
  "right:auto",
  "margin:1px 2px 3px 4px",
  "padding-right:2em",
  "direction:ltr",
  "float:right",
  "border-radius:1px 2px",
  "transform:translateX(-20px)",
  "text-shadow:2px 3px red",
  "background-position:25% 40%",
  "/*! @noflip */margin-left:7px",
];
for (let i = 0; i < 3000; i++) {
  const s =
    ".left:dir(rtl){" +
    Array.from({ length: 1 + random(8) }, () => decl[random(decl.length)]).join(
      ";",
    ) +
    "}";
  assert.equal(vpm.transform(s), require("cssjanus").transform(s));
  assert.equal(vpm.transform(s), require("cssjanus-app").transform(s));
  assert.equal(vpm.transform(vpm.transform(s)), s);
}
console.log(
  `${callers} unchanged RTL-wrapper/layer pipelines (upstream and VPM Stylis); 3000 seeded current/app differential and roundtrip cases pass.`,
);
