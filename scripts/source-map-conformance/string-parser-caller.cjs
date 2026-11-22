"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const fixture = path.join(__dirname, "node_modules");
if (process.argv[2]) {
  const location = path.join(process.argv[2], "node_modules/@babel/types");
  const types = require(location);
  const rawValues = [
    "Team practice",
    "line\r\nbreak",
    "\\u{1f600}",
    "\\x41",
    "\\8",
    "\\400",
    "\\xZ",
    "a\\u0041b",
    "trailing\\",
    "a${b",
    "a`b",
    "first\\nsecond",
    "first\\\nsecond",
    "\\${x}",
  ];
  const results = rawValues.map((raw) => {
    try {
      const head = types.templateElement({ raw }, false),
        tail = types.templateElement({ raw: "!" }, true);
      return types
        .templateLiteral([head, tail], [types.identifier("event")])
        .quasis.map((q) => q.value);
    } catch (error) {
      return [error.name, error.message];
    }
  });
  assert.equal(results[2][0].cooked, "😀");
  assert.equal(results[4][0].cooked, null);
  assert.equal(results[9][1], "Invalid raw");
  process.stdout.write(JSON.stringify(results));
} else {
  const scratch = fs.mkdtempSync(path.join(fixture, ".string-parser-caller-"));
  try {
    const scope = path.join(scratch, "node_modules/@babel");
    fs.mkdirSync(scope, { recursive: true });
    const alias = path.join(scope, "helper-string-parser");
    const run = (target) => {
      fs.symlinkSync(target, alias);
      try {
        return execFileSync(process.execPath, [__filename, scratch], {
          encoding: "utf8",
        });
      } finally {
        fs.unlinkSync(alias);
      }
    };
    const candidate = path.resolve(
      process.env.VPM_TRACE_INSTALL || path.join(__dirname, "../../packages"),
      "vbabel-helper-string-parser",
    );
    for (const [caller, helper] of [
      ["types-app", "string-parser-app"],
      ["types-nested", "string-parser-nested"],
      ["@babel/types", "@babel/helper-string-parser"],
    ]) {
      const dest = path.join(scope, "types");
      fs.cpSync(path.join(fixture, caller), dest, {
        recursive: true,
        filter: (source) => path.basename(source) !== "node_modules",
      });
      assert.equal(run(candidate), run(path.join(fixture, helper)), caller);
      fs.rmSync(dest, { recursive: true });
    }
    console.log(
      "Unchanged Babel Types template construction matches all three controls.",
    );
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
