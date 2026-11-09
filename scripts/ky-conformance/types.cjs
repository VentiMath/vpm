"use strict";
const path = require("node:path"),
  { compile, clean } = require("../platform-types.cjs");
const directory = process.argv[2] ?? __dirname;
const paths = process.argv[2]
  ? {}
  : {
      vky: [path.resolve(__dirname, "../../packages/vky/index.d.mts")],
      "vky/legacy": [
        path.resolve(__dirname, "../../packages/vky/legacy.d.mts"),
      ],
    };
for (const bundler of [false, true])
  clean(
    compile({
      compilerOptions: {
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        target: "ES2022",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: bundler ? "ESNext" : "NodeNext",
        moduleResolution: bundler ? "Bundler" : "NodeNext",
        types: [],
        paths,
      },
      files: [
        path.join(directory, "consumer.mts"),
        ...(bundler ? [] : [path.join(directory, "consumer.cts")]),
      ],
    }),
  );
console.log("TS7: strict NodeNext ESM/CJS and Bundler consumers pass.");
