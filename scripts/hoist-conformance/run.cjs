"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto"),
  { spawnSync } = require("node:child_process");
const source = path.join(__dirname, "upstream"),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "vpm-hoist-tests-"));
for (const [file, hash] of Object.entries(
  require("./upstream/provenance.json").sha256,
))
  assert.equal(
    createHash("sha256")
      .update(fs.readFileSync(path.join(source, file)))
      .digest("hex"),
    hash,
  );
try {
  const text = fs.readFileSync(path.join(source, "index.jsx.txt"), "utf8");
  for (const variant of ["upstream", "vpm"]) {
    const api =
      variant === "upstream"
        ? require.resolve("hoist-non-react-statics")
        : path.resolve(
            __dirname,
            "../../packages/vhoist-non-react-statics/index.cjs",
          );
    const redirected = text.replace("'../../src'", JSON.stringify(api));
    const code = require("esbuild").transformSync(redirected, {
      loader: "jsx",
      format: "cjs",
      target: "es2022",
    }).code;
    fs.writeFileSync(path.join(temp, "suite.cjs"), code);
    fs.symlinkSync(
      path.join(__dirname, "node_modules"),
      path.join(temp, "node_modules"),
      "dir",
    );
    const result = spawnSync(
      process.execPath,
      [
        require.resolve("mocha/bin/mocha.js"),
        path.join(temp, "suite.cjs"),
        "--reporter",
        "dot",
      ],
      { encoding: "utf8" },
    );
    console.log(variant + result.stdout);
    assert.equal(result.status, 0, result.stderr);
    fs.unlinkSync(path.join(temp, "node_modules"));
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
