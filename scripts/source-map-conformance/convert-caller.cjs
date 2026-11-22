"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fixtures = path.join(__dirname, "node_modules");
if (process.argv[2]) {
  const dir = process.argv[2],
    babel = require(path.join(dir, "node_modules/@babel/core"));
  const converter = require(path.join(dir, "node_modules/convert-source-map"));
  const input = {
    version: 3,
    file: "middle.js",
    sourceRoot: "/original",
    sources: ["math.ts"],
    names: ["π"],
    mappings: "AAAAA",
    sourcesContent: ["const π = 1;"],
  };
  const outputs = [];
  async function check() {
    for (const kind of ["object", "inline", "external", "invalid"]) {
      let code = "const pi = 1;";
      const options = {
        filename: path.join(dir, "middle.js"),
        configFile: false,
        babelrc: false,
        sourceMaps: "both",
      };
      if (kind === "object") options.inputSourceMap = input;
      if (kind === "inline")
        code += "\n" + converter.fromObject(input).toComment();
      if (kind === "external") {
        fs.writeFileSync(path.join(dir, "input.map"), JSON.stringify(input));
        code += "\n//# sourceMappingURL=input.map";
      }
      if (kind === "invalid")
        code += "\n//# sourceMappingURL=data:application/json;base64,Iw==";
      const sync = babel.transformSync(code, options);
      const asyncResult = await babel.transformAsync(code, options);
      assert.equal(sync.code, asyncResult.code);
      assert.deepEqual(converter.fromSource(sync.code).toObject(), JSON.parse(JSON.stringify(sync.map)));
      if (kind !== "invalid")
        assert.deepEqual(sync.map.sourcesContent, input.sourcesContent);
      outputs.push([sync.code, sync.map]);
    }
    console.log(JSON.stringify(outputs));
  }
  check().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
} else {
  const temp = fs.mkdtempSync(path.join(fixtures, ".convert-caller-"));
  try {
    const modules = path.join(temp, "node_modules");
    fs.mkdirSync(path.join(modules, "@babel"), { recursive: true });
    fs.cpSync(
      path.join(fixtures, "@babel/core"),
      path.join(modules, "@babel/core"),
      { recursive: true },
    );
    const alias = path.join(modules, "convert-source-map");
    const run = (target) => {
      fs.symlinkSync(target, alias);
      try {
        return JSON.parse(
          execFileSync(process.execPath, [__filename, temp], {
            encoding: "utf8",
          }),
        );
      } finally {
        fs.unlinkSync(alias);
      }
    };
    const upstream = run(path.join(fixtures, "convert-source-map"));
    const candidate = run(
      path.resolve(
        process.env.VPM_TRACE_INSTALL || path.join(__dirname, "../../packages"),
        "vconvert-source-map",
      ),
    );
    assert.deepEqual(candidate, upstream);
    console.log(
      "Babel core 7.29.0 synchronous and asynchronous transforms match on object, inline, external and invalid input maps.",
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
