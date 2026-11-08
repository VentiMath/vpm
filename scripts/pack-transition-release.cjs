"use strict";
const assert = require("node:assert/strict");
const args = process.argv.slice(2), take = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--ref") && args.includes("--tag") && args.includes("--out"));
require("./pack-cssjanus-release.cjs").build({ ref: take("--ref"), tag: take("--tag"), out: take("--out"), packageName: "vreact-transition-group", tagPrefix: "react-transition-group", installName: "react-transition-group", direct: true });
