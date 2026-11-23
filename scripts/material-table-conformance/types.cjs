const fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process"),
  assert = require("node:assert/strict");
const fixture = path.resolve(__dirname, "../react-table-conformance"),
  consumer = process.env.VPM_MATERIAL_CONSUMER || fixture;
const filename = path.join(consumer, ".material-types.tsx"),
  config = path.join(consumer, ".material-types.json");
try {
  fs.writeFileSync(
    filename,
    fs.readFileSync(path.join(__dirname, "types.tsx"), "utf8"),
  );
  for (const mode of ["NodeNext", "Bundler"]) {
    fs.writeFileSync(
      config,
      JSON.stringify({
        files: [filename],
        compilerOptions: {
          strict: true,
          noEmit: true,
          jsx: "react-jsx",
          target: "ES2022",
          lib: ["ES2022", "DOM"],
          types: [],
          module: mode === "Bundler" ? "Preserve" : mode,
          moduleResolution: mode,
          paths: process.env.VPM_MATERIAL_CONSUMER
            ? {}
            : {
                "vmaterial-react-table": [
                  path.resolve(
                    __dirname,
                    "../../packages/vmaterial-react-table/index.d." +
                      (mode === "Bundler" ? "mts" : "cts"),
                  ),
                ],
                react: [
                  path.join(fixture, "node_modules/@types/react/index.d.ts"),
                ],
                "react/jsx-runtime": [
                  path.join(
                    fixture,
                    "node_modules/@types/react/jsx-runtime.d.ts",
                  ),
                ],
                csstype: [path.join(fixture, "node_modules/csstype/index.d.ts")],
                "vmui-material": [path.resolve(__dirname, "../../packages/vmui-material/index.d.mts")],
                "vmui-material/styles": [path.resolve(__dirname, "../../packages/vmui-material/styles/index.d.mts")],
                "vtanstack-react-table": [
                  path.resolve(
                    __dirname,
                    "../../packages/vtanstack-react-table/index.d.cts",
                  ),
                ],
                "vtanstack-table-core": [
                  path.resolve(
                    __dirname,
                    "../../packages/vtanstack-table-core/index.d.cts",
                  ),
                ],
              },
        },
      }),
    );
    const r = spawnSync(
      "node",
      [require("../platform-types.cjs").compiler().path, "-p", config],
      { cwd: consumer, encoding: "utf8" },
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
  }
  console.log(
    "TS7 strict widget consumers pass in NodeNext and Bundler modes.",
  );
} finally {
  fs.rmSync(filename, { force: true });
  fs.rmSync(config, { force: true });
}
