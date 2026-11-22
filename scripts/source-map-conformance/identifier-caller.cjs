"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const fixture = path.join(__dirname, "node_modules");
if (process.argv[2]) {
  const location = path.join(process.argv[2], "node_modules/@babel/types");
  const types = require(location);
  const names = [
    "course",
    "9 steps",
    "x-y",
    "pi_π",
    "𐐀rank",
    "a\u200d",
    "3abc",
    "a\ud800z",
    "yield",
    "enum",
    "await",
    "arguments",
    "eval",
    "this",
    "null",
    "constructor",
    "true",
    "",
  ];
  const results = names.map((name) => [
    name,
    types.isValidIdentifier(name),
    types.isValidIdentifier(name, false),
    types.toIdentifier(name),
    types.toBindingIdentifierName(name),
  ]);
  assert.equal(types.isValidIdentifier("await"), false);
  assert.equal(types.toIdentifier("9 steps"), "steps");
  process.stdout.write(JSON.stringify(results));
} else {
  const scratch = fs.mkdtempSync(path.join(fixture, ".identifier-caller-"));
  try {
    const scope = path.join(scratch, "node_modules/@babel");
    fs.mkdirSync(scope, { recursive: true });
    fs.cpSync(path.join(fixture, "@babel/types"), path.join(scope, "types"), {
      recursive: true,
    });
    const alias = path.join(scope, "helper-validator-identifier");
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
    const baseline = run(
      path.join(fixture, "@babel/helper-validator-identifier"),
    );
    assert.equal(run(path.join(fixture, "identifier-app")), baseline);
    assert.equal(
      run(
        path.resolve(
          process.env.VPM_TRACE_INSTALL ||
            path.join(__dirname, "../../packages"),
          "vbabel-helper-validator-identifier",
        ),
      ),
      baseline,
    );
    console.log(
      "Unchanged Babel Types identifier validation, normalization and binding-name conversion match both releases.",
    );
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
