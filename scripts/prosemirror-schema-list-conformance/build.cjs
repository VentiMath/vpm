"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "../.."),
  out = path.join(__dirname, "node_modules/.vpm-schema-list");
fs.mkdirSync(out, { recursive: true });
for (const [file, hash] of Object.entries(require("./upstream.json").sha256))
  if (
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
      .digest("hex") !== hash
  )
    throw Error("Changed upstream fixture");
function resolver(variant) {
  return {
    name: "list-graph",
    setup(b) {
      b.onResolve(
        {
          filter:
            /^(v?prosemirror-(schema-list|history|state|model|transform|view|commands)|v?rope-sequence)$/,
        },
        ({ path: name }) => {
          const plain = name.replace(/^v(?=prosemirror|rope)/, "");
          if (
            (variant === "vpm" &&
              ![
                "prosemirror-view",
                "prosemirror-commands",
                "prosemirror-history",
              ].includes(plain)) ||
            (["app-vpm", "current-vpm"].includes(variant) &&
              plain === "prosemirror-schema-list")
          ) {
            const part =
              plain === "rope-sequence"
                ? "ROPE"
                : plain.slice(12).toUpperCase().replaceAll("-", "_");
            return {
              path:
                process.env["VPM_" + part + "_ENTRY"] ||
                path.join(root, "packages/v" + plain, "index.cjs"),
            };
          }
          const app = variant.startsWith("app");
          if (
            app &&
            ["prosemirror-view", "prosemirror-commands"].includes(plain)
          )
            return { path: require.resolve(plain + "-app") };
          if (app && plain === "prosemirror-schema-list")
            return { path: require.resolve("prosemirror-schema-list-app") };
          if (app && plain === "prosemirror-history")
            return { path: require.resolve("prosemirror-history-app") };
          if (app && plain === "prosemirror-model")
            return {
              path: require.resolve(
                "../prosemirror-model-conformance/node_modules/prosemirror-model-app",
              ),
            };
          if (app && plain === "prosemirror-transform")
            return {
              path: require.resolve(
                "../prosemirror-transform-conformance/node_modules/prosemirror-transform-app",
              ),
            };
          return { path: require.resolve(plain) };
        },
      );
    },
  };
}
module.exports = { resolver, out };
if (require.main === module)
  (async () => {
    for (const variant of [
      "upstream",
      "app",
      "vpm",
      "app-vpm",
      "current-vpm",
    ]) {
      const r = await Bun.build({
        entrypoints: [path.join(__dirname, "upstream/test-commands.ts")],
        target: "node",
        format: "cjs",
        plugins: [resolver(variant)],
      });
      if (!r.success) throw Error(r.logs.join("\n"));
      fs.writeFileSync(
        path.join(out, variant + ".cjs"),
        "const results=[];const describe=(n,f)=>f();const it=(name,fn)=>{try{fn();results.push({name,pass:true})}catch(e){results.push({name,pass:false,error:e.stack})}};\n" +
          (await r.outputs[0].text()) +
          "\nconsole.log(JSON.stringify(results));",
      );
    }
    for (const variant of [
      "upstream",
      "app",
      "vpm",
      "app-vpm",
      "current-vpm",
    ]) {
      const entry = path.join(out, "api-" + variant + ".mjs");
      fs.writeFileSync(
        entry,
        `export * as L from "prosemirror-schema-list";export * as H from "prosemirror-history";export * as S from "prosemirror-state";export * as M from "prosemirror-model";export * as T from "prosemirror-transform";`,
      );
      const r = await Bun.build({
        entrypoints: [entry],
        target: "node",
        format: "cjs",
        plugins: [resolver(variant)],
      });
      if (!r.success) throw Error(r.logs.join("\n"));
      fs.writeFileSync(
        path.join(out, "api-" + variant + ".cjs"),
        await r.outputs[0].text(),
      );
    }
    const bundles = [];
    for (const variant of ["upstream", "app", "vpm"]) {
      const entry = path.join(out, "browser-" + variant + ".mjs");
      fs.writeFileSync(
        entry,
        `import setup from ${JSON.stringify(path.join(__dirname, "browser-entry.cjs"))};window.listVariants??={};window.listVariants[${JSON.stringify(variant)}]=setup(${JSON.stringify(variant)});`,
      );
      const r = await Bun.build({
        entrypoints: [entry],
        target: "browser",
        format: "iife",
        plugins: [resolver(variant)],
      });
      if (!r.success) throw Error(r.logs.join("\n"));
      bundles.push(await r.outputs[0].text());
    }
    fs.writeFileSync(
      path.join(out, "bundle.js"),
      bundles.join("\n") +
        `
window.runChecks=()=>{
  const values=Object.fromEntries(Object.entries(window.listVariants).map(([name,v])=>[name,v.exercise()]));
  if(JSON.stringify(values.vpm)!==JSON.stringify(values.upstream))throw Error('Current Tiptap list mismatch');
  if(JSON.stringify(values.app.slice(0,13))!==JSON.stringify(values.upstream.slice(0,13)))throw Error('App Tiptap list mismatch');
  if(JSON.stringify(values.app[14])!==JSON.stringify(values.upstream[14]))throw Error('App nested deletion mismatch');
  if(values.app.length!==15||values.upstream.length!==15)throw Error('Missing deletion snapshot');
  return {variants:3,snapshots:15,appDifferences:['transform 1.11.0 boundary deletion']};
};window.modifier=/Mac|iPhone|iPad|iPod/.test(navigator.platform)?4:2;`,
    );
    console.log("Built list API and unchanged tests on five graphs.");
  })().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
