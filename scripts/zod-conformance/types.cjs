"use strict";
const path = require("node:path"),
  { compile, clean } = require("../platform-types.cjs");
const directory = process.argv[2] ?? __dirname;
const paths = process.argv[2]
  ? {}
  : {
      "vreact-hook-form": [
        path.resolve(__dirname, "../../packages/vreact-hook-form/index.d.mts"),
      ],
      "vhookform-resolvers": [
        path.resolve(
          __dirname,
          "../../packages/vhookform-resolvers/index.d.mts",
        ),
      ],
      "vhookform-resolvers/zod": [
        path.resolve(__dirname, "../../packages/vhookform-resolvers/zod.d.mts"),
      ],
      vzod: [path.resolve(__dirname, "../../packages/vzod/index.d.mts")],
      react: [
        path.resolve(
          __dirname,
          "../hook-form-conformance/node_modules/@types/react/index.d.ts",
        ),
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
        lib: ["ES2022", "DOM", "DOM.Iterable", "ES2022.Intl"],
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
