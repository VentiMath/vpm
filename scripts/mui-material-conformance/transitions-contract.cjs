"use strict";
const assert = require("node:assert/strict"),
  path = require("node:path");
const { peer, packages } = require("./paths.cjs");
const create = require(
  path.join(packages, "vmui-material/transition-settings.cjs"),
).createTransitions;
const controls = ["mui-material-app", "@mui/material"].map(
  (p) =>
    require(
      path.join(
        path.dirname(peer.resolve(p + "/styles")),
        "createTransitions.js",
      ),
    ).default,
);
for (const input of [
  {},
  { easing: { sharp: "linear" }, duration: { standard: 400, shorter: 90 } },
  { duration: { standard: 0 } },
]) {
  const a = create(input);
  for (const control of controls) {
    const b = control(input);
    assert.deepEqual(a.duration, b.duration);
    assert.deepEqual(a.easing, b.easing);
    for (const properties of [
      undefined,
      "margin",
      ["transform", "width", "min-width"],
      ["background-color"],
      ["opacity"],
      [],
    ])
      for (const options of [
        {},
        { duration: 0 },
        { duration: 123.5, delay: 12.1 },
        { duration: "0.2s", easing: "linear", delay: "75ms" },
      ])
        assert.equal(
          a.create(properties, options),
          b.create(properties, options),
        );
    for (let height = 0; height < 10000; height += 0.5)
      assert.equal(
        a.getAutoHeightDuration(height),
        b.getAutoHeightDuration(height),
      );
  }
}
const options = { duration: { short: 18 }, easing: { easeOut: "linear" } },
  before = structuredClone(options);
const a = create(options),
  b = create(options);
a.duration.short = 20;
assert.equal(b.duration.short, 18);
assert.deepEqual(options, before);
const override = () => 23;
assert.equal(
  create({ getAutoHeightDuration: override }).getAutoHeightDuration,
  override,
);
const custom = () => "none";
assert.equal(create({ create: custom }).create, custom);
assert.equal(create({ reducedMotion: true }).reducedMotion, undefined);
assert.equal(create().getAutoHeightDuration(1e12), 3000);
if (process.env.VPM_APP_CHECKOUT) {
  const { execFileSync } = require("node:child_process");
  const files = [
    "FusePageCarded/FusePageCarded.tsx",
    "FusePageSimple/FusePageSimple.tsx",
    "FuseSearch/FuseSearch.tsx",
    "FuseSidePanel/FuseSidePanel.tsx",
  ];
  let calls = 0;
  for (const file of files) {
    const source = execFileSync(
      "git",
      [
        "-C",
        process.env.VPM_APP_CHECKOUT,
        "show",
        "origin/main:src/@fuse/core/" + file,
      ],
      { encoding: "utf8" },
    );
    // Evaluate unchanged literal-property calls with their actual theme settings.
    const pattern =
      /theme\.transitions\.create\(\s*('(?:[^']*)'|\[[\s\S]*?\])\s*,\s*(\{[\s\S]*?\})\s*\)/g;
    for (const match of source.matchAll(pattern)) {
      const invoke = require("node:vm").compileFunction(
        "return theme.transitions.create(" + match[1] + "," + match[2] + ");",
        ["theme"],
      );
      assert.equal(
        invoke({ transitions: create() }),
        invoke({ transitions: controls[0]({}) }),
      );
      calls++;
    }
  }
  assert.ok(calls >= 8);
  console.log(calls, "app transition calls matched.");
}
console.log(
  "Transition formatting, defaults, automatic timing and overrides passed.",
);
