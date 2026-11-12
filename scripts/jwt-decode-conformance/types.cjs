"use strict";
const path = require("node:path"),
  { compile, clean } = require("../platform-types.cjs");
const dir = process.argv[2] ?? __dirname,
  root = path.resolve(__dirname, "../../packages/vjwt-decode");
const paths = process.argv[2] ? {} : { "vjwt-decode": [root + "/index.d.mts"] };
for (const bundler of [false, true]) {
  const result = compile({
    compilerOptions: {
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      target: "ES2022",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: bundler ? "ESNext" : "NodeNext",
      moduleResolution: bundler ? "Bundler" : "NodeNext",
      types: [],
      typeRoots: [dir + "/node_modules/@types"],
      paths,
    },
    files: [dir + "/consumer.mts", ...(bundler ? [] : [dir + "/consumer.cts"])],
  });
  if (result.status) {
    console.error(
      result.output
        .split("\n")
        .filter((l) => l.includes("error TS"))
        .join("\n"),
    );
    process.exit(1);
  }
  clean(result);
}
console.log(
  "TS7 strict CJS/ESM and bundler consumers with current named and app default decoder imports pass",
);
