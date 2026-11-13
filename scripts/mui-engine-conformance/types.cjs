"use strict";
const path = require("node:path"),
  { compile, clean } = require("../platform-types.cjs");
const dir = process.argv[2] ?? __dirname,
  root = path.resolve(__dirname, "../../packages/vmui-styled-engine");
const paths = process.argv[2]
  ? {}
  : {
      "vmui-styled-engine": [root + "/index.d.mts"],
      "vmui-styled-engine/*": [root + "/*.d.mts"],
      react: [__dirname + "/node_modules/@types/react/index.d.ts"],
    };
if (!process.argv[2]) {
  const fs = require("node:fs");
  for (const name of fs.readdirSync(path.resolve(root, "..")))
    if (name.startsWith("vemotion-") || name === "vstylis") {
      const base = path.resolve(root, "../" + name),
        meta = require(base + "/package.json");
      paths[name] = [base + "/" + (meta.types || "index.d.ts")];
      paths[name + "/*"] = [base + "/*"];
    }
  paths.csstype = [__dirname + "/node_modules/csstype/index.d.ts"];
  paths["@mui/styled-engine"] = [root + "/index.d.mts"];
  paths["@mui/styled-engine/*"] = [root + "/*.d.mts"];
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
    files: [
      dir + "/consumer.mts",
      ...(bundler ? [] : [dir + "/consumer.cts"]),
      ...(!process.argv[2] ? [__dirname + "/system-consumer.mts"] : []),
    ],
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
  "TS7 strict CJS/ESM and bundler styling consumers and MUI styled generics pass",
);
