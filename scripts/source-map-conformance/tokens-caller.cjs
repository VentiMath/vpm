"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict");
const stage = require("./tokens-fixture.cjs");
const local = path.join(
  process.env.VPM_TRACE_INSTALL || path.resolve(__dirname, "../../packages"),
  "vjs-tokens",
);
const upstream = path.join(__dirname, "node_modules/js-tokens");
delete process.env.NO_COLOR;
process.env.FORCE_COLOR = "1";
const sources = [
  "const 队名 = 'Algebra';\r\n\texport const Row = <li role={}>{队名}</li>;",
  "const regex = /[a-z/]+/gi;\nexport const score = points / 2 / n + ;",
  "const title = `Points: ${result?.total}`;\nrender(title, );\n/* incomplete",
  "interface Row { name: string }\nconst row: Row = { name: };",
  "const label = 'dangling\\\nquote;\n/* end",
  "@decorator\nclass Team { #score = 1_000n }",
  "",
];
for (const version of ["@babel/code-frame", "code-frame-app"]) {
  const a = stage(upstream, version, { compiler: true });
  try {
    const b = stage(local, version, { compiler: true });
    try {
      for (const text of sources) {
        assert.equal(b.frame.highlight(text), a.frame.highlight(text));
        for (const forceColor of [true, false]) {
          const options = {
            forceColor,
            highlightCode: forceColor,
            message: "Expected a value",
          };
          const span = {
            start: { line: 2, column: 3 },
            end: { line: 2, column: 14 },
          };
          assert.equal(
            b.frame.codeFrameColumns(text, span, options),
            a.frame.codeFrameColumns(text, span, options),
          );
        }
      }
      for (const text of sources.slice(0, 2).concat(sources[3])) {
        function diagnostic(core) {
          try {
            core.transformSync(text, {
              filename: "Palette.tsx",
              babelrc: false,
              configFile: false,
              parserOpts: { plugins: ["jsx", "typescript"] },
            });
          } catch (e) {
            assert.equal(e.code, "BABEL_PARSE_ERROR");
            return e.message;
          }
          assert.fail("Expected a Babel parser diagnostic");
        }
        const output = diagnostic(b.core);
        assert.equal(output, diagnostic(a.core));
        assert.ok(output.includes("^") && output.includes("\x1b["));
      }
    } finally {
      b.close();
    }
  } finally {
    a.close();
  }
}
console.log(
  "Both Babel code-frame versions and Babel Core parser diagnostics match.",
);
