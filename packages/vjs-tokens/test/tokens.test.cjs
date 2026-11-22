"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path"),
  fs = require("node:fs");
const vpm = require("..");
const fixture = path.resolve(
  __dirname,
  "../../../scripts/source-map-conformance/node_modules",
);
const upstream = require(path.join(fixture, "js-tokens"));
function scan(api, text) {
  const rx = new RegExp(api.default);
  return Array.from(text.matchAll(rx), (m) => [m.index, api.matchToToken(m)]);
}
test("global regexp preserves source spans, token classes and closed state", () => {
  const inputs = [
    "",
    "@decorator class A { #field = 1_000n }",
    "let α=0xA2 + 3e-10; // points\r\n",
    "x / 2 / n; /[a/b]+/gi.test(x)",
    "'unterminated\\",
    "/* open",
    "`Points: ${format({label:'x'})}`",
    "export const Widget = () => <Box color={}/>;",
  ];
  const babel = path.join(fixture, "@babel");
  for (const file of fs
    .readdirSync(babel, { recursive: true })
    .filter((p) => p.endsWith(".js")))
    inputs.push(fs.readFileSync(path.join(babel, file), "utf8"));
  for (const source of inputs) {
    const result = scan(vpm, source);
    assert.deepEqual(result, scan(upstream, source));
    assert.equal(result.map(([, t]) => t.value).join(""), source);
    assert.deepEqual(source.match(vpm.default), source.match(upstream.default));
  }
});
test("reusable native expression and module interop", async () => {
  const esm = await import("../index.mjs");
  assert.equal(esm.default, vpm.default);
  assert.equal(esm.matchToToken, vpm.matchToToken);
  const rx = vpm.default;
  rx.lastIndex = 2;
  assert.equal(rx.exec("a + b").index, 2);
  rx.lastIndex = 20;
  assert.equal(rx.exec("a"), null);
  assert.equal(rx.lastIndex, 0);
  for (const source of [
    "x = 2",
    "// ok",
    "/* truncated",
    "'ok'",
    "'truncated",
  ]) {
    assert.equal(
      source.replace(rx, "[$&]"),
      source.replace(upstream.default, "[$&]"),
    );
  }
});
