"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { compile, clean } = require("../platform-types.cjs");
const root = path.resolve(__dirname, "../.."),
  peer = process.env.VPM_REACT_CONSUMER || __dirname,
  candidate =
    process.env.VPM_REACT_TABLE_ENTRY ||
    path.join(root, "packages/vtanstack-react-table");
for (const mode of ["NodeNext", "Bundler"]) {
  const paths = {
    react: [path.join(peer, "node_modules/@types/react/index.d.ts")],
    "react-dom": [path.join(peer, "node_modules/@types/react-dom/index.d.ts")],
    "react/jsx-runtime": [
      path.join(peer, "node_modules/@types/react/jsx-runtime.d.ts"),
    ],
    "@tanstack/react-table": [path.join(candidate, "index.d.cts")],
    "vtanstack-react-table": [path.join(candidate, "index.d.cts")],
    "vtanstack-react-table/*": [path.join(candidate, "*.d.cts")],
    "vtanstack-table-core": [
      path.join(
        process.env.VPM_TABLE_ENTRY ||
          path.join(root, "packages/vtanstack-table-core"),
        "index.d.cts",
      ),
    ],
  };
  const config = {
    files: [path.join(__dirname, "types.tsx")],
    compilerOptions: {
      strict: true,
      noEmit: true,
      target: "es2022",
      lib: ["es2022", "dom", "dom.iterable"],
      types: [],
      module: mode === "Bundler" ? "Preserve" : mode,
      moduleResolution: mode,
      skipLibCheck: false,
      jsx: "react-jsx",
      paths,
    },
  };
  const actual = compile(config);
  const baseline = compile({
    ...config,
    compilerOptions: {
      ...config.compilerOptions,
      paths: {
        ...paths,
        "@tanstack/react-table": [
          require
            .resolve("react-table-app")
            .replace(/index\.js$/, "index.d.ts"),
        ],
      },
    },
  });
  const diagnostics = (r) =>
    r.output.split("\n").filter((l) => l.includes("error TS"));
  assert.deepEqual(diagnostics(actual), diagnostics(baseline));
  assert.equal(diagnostics(actual).length, 3);
  for (const line of diagnostics(actual))
    assert.match(
      line,
      /material-react-table\/dist\/index\.d\.ts.*TS2707.*(?:DatePickerProps|DateTimePickerProps|TimePickerProps)/,
    );
}
console.log(
  "TS7 hooks and selected state pass; unchanged MRT declarations match the app control with three existing MUI date-picker generic diagnostics.",
);
