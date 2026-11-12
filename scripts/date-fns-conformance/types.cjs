"use strict";
const path = require("node:path"),
  { compile, clean } = require("../platform-types.cjs");
const dir = process.argv[2] ?? __dirname,
  root = path.resolve(__dirname, "../../packages/vdate-fns");
const paths = process.argv[2]
  ? {}
  : {
      "vdate-fns": [root + "/index.d.mts"],
      "vdate-fns/*": [root + "/*.d.mts"],
      "vdate-fns/locale": [root + "/locale/index.d.mts"],
      "date-fns/locale": [root + "/locale/index.d.mts"],
    };
paths["react-transition-group/*"] = [
  dir + "/node_modules/@types/react-transition-group/*.d.ts",
];
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
        typeRoots: [dir + "/node_modules/@types"],
        paths,
      },
      files: [
        dir + "/consumer.mts",
        ...(bundler ? [] : [dir + "/consumer.cts"]),
      ],
    }),
  );
console.log(
  "TS7 strict ESM/CJS, bundler and unchanged MUI adapter consumers pass",
);
