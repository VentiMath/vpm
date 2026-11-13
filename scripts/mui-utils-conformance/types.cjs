"use strict";
const path = require("node:path"),
  { compile, clean } = require("../platform-types.cjs");
const dir = process.argv[2] ?? __dirname,
  root = path.resolve(__dirname, "../../packages/vmui-utils");
const paths = process.argv[2]
  ? {}
  : {
      "vmui-utils": [root + "/index.d.mts"],
      "vmui-utils/*": [root + "/*.d.mts"],
      react: [__dirname + "/node_modules/@types/react/index.d.ts"],
    };
if (!process.argv[2]) {
  paths["@mui/utils"] = [root + "/index.d.mts"];
  paths["@mui/utils/*"] = [root + "/*.d.mts"];
}
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
  "TS7 strict utility hooks, prop helpers, roving API and unchanged Material declarations pass",
);
