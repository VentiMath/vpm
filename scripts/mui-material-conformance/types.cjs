"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const { compile, clean } = require("../platform-types.cjs"),
  { fixture, root } = require("./paths.cjs"),
  dir = process.argv[2] || __dirname;
for (const bundler of [false, true]) {
  const paths = {};
  if (!process.argv[2]) {
    for (const name of fs.readdirSync(root + "/packages")) {
      const p = root + "/packages/" + name,
        meta = require(p + "/package.json");
      if (meta.types) {
        paths[name] = [p + "/" + meta.types];
        paths[name + "/*"] = [p + "/*.d." + (bundler ? "mts" : "cts")];
      }
    }
    paths["vmui-material"] = [root + "/packages/vmui-material/index.d.mts"];
    paths["vmui-material/*"] = [root + "/packages/vmui-material/*.d.mts"];
    paths["vmui-material/styles"] = [root + "/packages/vmui-material/styles/index.d.mts"];
    paths["vmui-material/utils"] = [root + "/packages/vmui-material/utils/index.d.mts"];
    for (const n of ["react", "react-dom"])
      paths[n] = [fixture + "/node_modules/@types/" + n + "/index.d.ts"];
    paths["csstype"] = [fixture + "/node_modules/csstype/index.d.ts"];
  }
  const r = compile({
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
    files: [dir + "/consumer.mts", ...(bundler ? [] : [dir + "/consumer.cts"])],
  });
  if (r.status) {
    console.error(
      r.output
        .split("\n")
        .filter((l) => l.includes("error TS"))
        .join("\n"),
    );
    process.exit(1);
  }
  clean(r);
}
console.log(
  "Strict TS7 Material component roots, router props, refs, styles and negative consumers pass NodeNext/Bundler",
);
