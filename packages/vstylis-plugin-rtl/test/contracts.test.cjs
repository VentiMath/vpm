"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const entry = process.env.VPM_RTL_ENTRY || path.resolve(__dirname, ".."),
  plugin = require(entry),
  engine = require("../../vstylis"),
  pipeline = require("../../../scripts/rtl-conformance/pipeline.cjs");
const render = (css, options) => pipeline(engine, plugin, css, options);
test("nested at-rules and logical properties", () => {
  for (const rule of [
    "@layer app",
    "@container (min-width:1px)",
    "@scope (.scope)",
    "@supports (display:grid)",
    "@media (width>1px)",
  ])
    assert.equal(
      render(rule + "{.x{left:1px;margin-inline-start:2px}}"),
      rule + "{.x{right:1px;margin-inline-start:2px;}}",
    );
});
test("noflip binds by source order even when Stylis lifts nested rules", () => {
  assert.equal(
    render("/* @noflip */.x{left:1px;.y{right:2px}}.z{left:3px}"),
    ".x{left:1px;}.x .y{right:2px;}.z{right:3px;}",
  );
  assert.equal(
    render(".x{/* @noflip */.y{left:2px}right:1px}"),
    ".x{left:1px;}.x .y{left:2px;}",
  );
  assert.equal(
    render(".x{/* @noflip */left:1px;right:2px}"),
    ".x{left:1px;left:2px;}",
  );
});
test("RootThemeProvider layer wrapping and direction changes", () => {
  assert.equal(
    render(".x{padding-left:12px}", { layer: true }),
    "@layer mui{.x{padding-right:12px;}}",
  );
  assert.equal(
    render(".x{margin-left:1px;& .child{margin-left:3px}}", { layer: true }),
    "@layer mui{.x{margin-right:1px;}}@layer mui{.x .child{margin-right:3px;}}",
  );
  assert.equal(
    render(".x{padding-left:12px}", { layer: true, rtl: false }),
    "@layer mui{.x{padding-left:12px;}}",
  );
  assert.equal(
    render(".x{padding-left:12px}", { layer: true }),
    "@layer mui{.x{padding-right:12px;}}",
  );
});
test("prefixer and keyframe copies reflect each declaration once", () => {
  const css =
    "@keyframes slide{from{left:0;transform:translateX(2px)}to{left:10px}}";
  const before = engine.serialize(
    engine.compile(css),
    engine.middleware([engine.prefixer, plugin, engine.stringify]),
  );
  const after = render(css, { prefix: true });
  assert.equal(before, after);
  assert.match(after, /@-webkit-keyframes/);
  assert.doesNotMatch(after, /left:/);
  assert.match(after, /translateX\(-2px\)/);
});
test("retains node identity, positions and source ownership without reparsing", () => {
  const ast = engine.compile(".x{left:1px;color:red}"),
    node = ast[0].children[0],
    coords = [node.line, node.column],
    parent = node.parent;
  const first = engine.serialize(
    ast,
    engine.middleware([plugin, engine.stringify]),
  );
  assert.equal(ast[0].children[0], node);
  assert.deepEqual([node.line, node.column], coords);
  assert.equal(node.parent, parent);
  assert.equal(node.props, "right");
  assert.equal(node.children, "1px");
  assert.equal(node.length, 5);
  assert.equal(
    engine.serialize(ast, engine.middleware([plugin, engine.stringify])),
    first,
  );
});
test("CSSJanus corrections and dynamic declaration callbacks", () => {
  assert.equal(
    render('.x{--left:right;content:"left;right:{}"}'),
    '.x{--left:right;content:"left;right:{}";}',
  );
  const ast = engine.compile(".x{left:1px}");
  engine.serialize(ast, engine.middleware([plugin, engine.stringify]));
  const extra = engine.compile(".a{right:2px}")[0].children[0];
  plugin(extra, 0, [extra]);
  assert.equal(extra.value, "left:2px;");
  assert.equal(plugin.name, "stylisRTLPlugin");
  assert.equal(plugin.default, plugin);
});
