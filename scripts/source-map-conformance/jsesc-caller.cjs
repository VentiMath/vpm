"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fixture = path.join(__dirname, "node_modules");
if (process.argv[2]) {
  const generate = require(
    path.join(process.argv[2], "node_modules/@babel/generator"),
  ).default;
  const parser = require("@babel/parser");
  const values = [
    "About You",
    "O'Brien: π/√2",
    "日本語🙂",
    "\u2028$\x7bterm}",
    "</STYLE>",
    "lone\ud800",
    46,
    255,
  ];
  const expressions = values.map((value) => ({
    type: typeof value === "number" ? "NumericLiteral" : "StringLiteral",
    value,
  }));
  const ast = { type: "ArrayExpression", elements: expressions };
  const output = [];
  for (const options of [
    {},
    { minified: true },
    { jsonCompatibleStrings: true },
    { jsescOption: { minimal: true } },
    { jsescOption: { es6: true, quotes: "single" } },
    { jsescOption: { numbers: "hexadecimal", isScriptContext: true } },
  ]) {
    const { code, map } = generate(ast, { ...options, sourceMaps: true });
    assert.deepEqual(
      parser.parseExpression(code).elements.map((e) => e.value),
      values,
    );
    output.push([code, map]);
  }
  process.stdout.write(JSON.stringify(output));
} else {
  const scratch = fs.mkdtempSync(path.join(fixture, ".literal-caller-"));
  try {
    const modules = path.join(scratch, "node_modules");
    fs.mkdirSync(path.join(modules, "@babel"), { recursive: true });
    fs.cpSync(
      path.join(fixture, "@babel/generator"),
      path.join(modules, "@babel/generator"),
      { recursive: true },
    );
    const link = path.join(modules, "jsesc");
    const run = (target) => {
      fs.symlinkSync(target, link);
      try {
        return execFileSync(process.execPath, [__filename, scratch], {
          encoding: "utf8",
        });
      } finally {
        fs.unlinkSync(link);
      }
    };
    const upstream = run(path.join(fixture, "jsesc"));
    const result = run(
      path.resolve(
        process.env.VPM_TRACE_INSTALL || path.join(__dirname, "../../packages"),
        "vjsesc",
      ),
    );
    assert.equal(result, upstream);
    console.log(
      "Babel generator printed and reparsed identical literals in six configurations.",
    );
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
