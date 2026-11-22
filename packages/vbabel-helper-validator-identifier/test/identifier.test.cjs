"use strict";
const assert = require("node:assert/strict"),
  { test } = require("node:test"),
  api = require("..");
const fixture = require("node:module").createRequire(
  require.resolve("../../../scripts/source-map-conformance/package.json"),
);
const controls = [
  fixture("@babel/helper-validator-identifier"),
  fixture("identifier-app"),
];
test("classify all Unicode code points against both Babel releases", () => {
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    const start = api.isIdentifierStart(cp),
      part = api.isIdentifierChar(cp);
    for (const control of controls)
      if (
        start !== control.isIdentifierStart(cp) ||
        part !== control.isIdentifierChar(cp)
      )
        assert.fail("U+" + cp.toString(16));
  }
  for (const bad of [-1, 1.5, Infinity, NaN, 0x110000]) {
    assert.equal(api.isIdentifierStart(bad), false);
    assert.equal(api.isIdentifierChar(bad), false);
  }
});
test("identifier names handle astral letters, continuations and literal UTF-16", () => {
  const pieces = [
    "",
    "_",
    "$",
    "a",
    "9",
    "π",
    "中",
    "𐐀",
    "\u0301",
    "\u200c",
    "\u200d",
    "\ud800",
    "\udc00",
    "!",
    "\n",
    "\\u0061",
  ];
  for (const first of pieces)
    for (const rest of pieces)
      for (const last of pieces) {
        const name = first + rest + last;
        for (const control of controls)
          assert.equal(
            api.isIdentifierName(name),
            control.isIdentifierName(name),
            JSON.stringify(name),
          );
      }
});
test("reserved words and binding restrictions vary by module and strict mode", () => {
  const words =
    "break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with static implements interface let package private protected public yield eval arguments enum await async of as get set using accessor target from constructor __proto__".split(
      " ",
    );
  for (const word of [...words, ...words.map((w) => w.toUpperCase())])
    for (const module of [true, false])
      for (const fn of [
        "isKeyword",
        "isReservedWord",
        "isStrictReservedWord",
        "isStrictBindOnlyReservedWord",
        "isStrictBindReservedWord",
      ])
        for (const control of controls)
          assert.equal(
            api[fn](word, module),
            control[fn](word, module),
            fn + " " + word,
          );
});
