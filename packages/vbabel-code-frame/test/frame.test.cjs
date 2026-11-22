"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const own = require("..");
const controls = ["@babel/code-frame", "code-frame-app"].map((name) =>
  require(
    path.resolve(
      __dirname,
      "../../../scripts/source-map-conformance/node_modules",
      name,
    ),
  ),
);
const strip = require("node:util").stripVTControlCharacters;
test("colored and plain diagnostics retain source, ranges and context", () => {
  const sources = [
    "const x = ;",
    "class Foo {\n  constructor()\n};",
    "let π = /x/g;\r\nexport const Row = <Box x={}/>;",
    "@decorator\nclass Name { #x = 100 }",
    "// comment\nconst x = `Hi ${name}`;",
    "",
    "\t\treturn 10;\n\tif(x) {}",
  ];
  for (const text of sources)
    for (const control of controls) {
      assert.equal(own.highlight(text), control.highlight(text));
      const lines = text.split(/\r\n|\n/);
      for (let line = 1; line <= lines.length; line++)
        for (const column of [undefined, 0, 1, 3, 15])
          for (const forceColor of [false, true]) {
            const options = {
              forceColor,
              message: "Expected an expression",
              linesAbove: 1,
              linesBelow: 1,
            };
            const loc = { start: { line, column } };
            if (
              forceColor &&
              (text.includes("\t") || column > lines[line - 1].length + 1)
            ) {
              assert.equal(
                strip(own.codeFrameColumns(text, loc, options)),
                own.codeFrameColumns(text, loc, {
                  ...options,
                  forceColor: false,
                }),
              );
              continue;
            }
            assert.equal(
              own.codeFrameColumns(text, loc, options),
              control.codeFrameColumns(text, loc, options),
            );
          }
    }
});
test("colored tab alignment and multiline ranges use the raw source line widths", () => {
  const text = "const x = 1;\t\t?\nabc\nabcdefghijkl\nend";
  const span = { start: { line: 1, column: 15 }, end: { line: 4, column: 3 } };
  const plain = own.codeFrameColumns(text, span);
  for (const col of [0, 1, 3]) {
    const loc = {
      start: { line: 1, column: col },
      end: { line: 1, column: 5 },
    };
    assert.equal(
      own.codeFrameColumns("hello world", loc),
      controls[0].codeFrameColumns("hello world", loc),
    );
  }
  assert.equal(
    strip(own.codeFrameColumns(text, span, { forceColor: true })),
    plain,
  );
  assert.ok(plain.includes("  | ^^^^^^^^^^^^"));
  assert.equal(
    own.codeFrameColumns("", { start: { line: 1, column: 100 } }),
    "> 1 |\n    | ^",
  );
});
test("offsets, overrides and module entry points", async () => {
  const esm = await import("../index.mjs");
  assert.equal(esm.default, own.default);
  assert.equal(esm.highlight, own.highlight);
  assert.equal(
    own.codeFrameColumns(
      "a\nb",
      { start: { line: 102, column: 1 } },
      { startLine: 101 },
    ),
    controls[0].codeFrameColumns(
      "a\nb",
      { start: { line: 102, column: 1 } },
      { startLine: 101 },
    ),
  );
  const old = process.env.FORCE_COLOR;
  process.env.FORCE_COLOR = "0";
  try {
    assert.equal(
      own.codeFrameColumns(
        "x",
        { start: { line: 1 } },
        { highlightCode: true },
      ),
      "> 1 | x",
    );
    assert.match(
      own.codeFrameColumns("x", { start: { line: 1 } }, { forceColor: true }),
      /\x1b\[/,
    );
  } finally {
    if (old === undefined) delete process.env.FORCE_COLOR;
    else process.env.FORCE_COLOR = old;
  }
});
