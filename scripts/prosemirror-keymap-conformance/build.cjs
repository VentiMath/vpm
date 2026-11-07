"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "../.."),
  out = path.join(__dirname, "node_modules/.vpm-keymap");
fs.mkdirSync(out, { recursive: true });
const manifest = require("./upstream.json");
for (const [file, hash] of Object.entries(manifest.sha256))
  if (
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
      .digest("hex") !== hash
  )
    throw Error("Upstream source changed: " + file);
function resolver(variant) {
  return {
    name: "keymap-graph",
    setup(build) {
      build.onResolve(
        {
          filter:
            /^(v?prosemirror-(keymap|state|model|transform|commands)|v?w3c-keyname)$/,
        },
        ({ path: name }) => {
          const plain = name.replace(/^v(?=prosemirror|w3c)/, "");
          if (variant === "vpm" && plain !== "prosemirror-commands") {
            const key =
              plain === "w3c-keyname"
                ? "KEYNAME"
                : plain.slice("prosemirror-".length).toUpperCase();
            return {
              path:
                process.env["VPM_" + key + "_ENTRY"] ||
                path.join(root, "packages/v" + plain, "index.cjs"),
            };
          }
          if (plain === "prosemirror-commands")
            return {
              path: require.resolve(
                "../prosemirror-commands-conformance/node_modules/" +
                  (variant === "app" ? "prosemirror-commands-app" : plain),
              ),
            };
          if (variant === "app" && plain === "prosemirror-model")
            return {
              path: require.resolve(
                "../prosemirror-model-conformance/node_modules/prosemirror-model-app",
              ),
            };
          if (variant === "app" && plain === "prosemirror-transform")
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
(async () => {
  const bundles = [];
  for (const variant of ["upstream", "app", "vpm"]) {
    const plugins = [resolver(variant)];
    if (variant !== "app") {
      const r = await Bun.build({
        entrypoints: [path.join(__dirname, "upstream/test-keymap.ts")],
        target: "node",
        format: "cjs",
        plugins,
      });
      if (!r.success) throw Error(r.logs.join("\n"));
      fs.writeFileSync(
        path.join(out, variant + "-tests.cjs"),
        `Object.defineProperty(globalThis,"navigator",{value:{platform:"Linux",userAgent:"keymap conformance"},configurable:true});const results=[];const describe=(_name,fn)=>fn();const it=(name,fn)=>{try{fn();results.push({name,pass:true})}catch(e){results.push({name,pass:false,message:e.message})}};\n` +
          (await r.outputs[0].text()) +
          `\nconsole.log(JSON.stringify(results));`,
      );
    }
    const entry = path.join(out, variant + ".mjs");
    fs.writeFileSync(
      entry,
      `import setup from ${JSON.stringify(path.join(__dirname, "browser-entry.cjs"))};window.keymapVariants??={};window.keymapVariants[${JSON.stringify(variant)}]=setup(${JSON.stringify(variant)});`,
    );
    const r = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "iife",
      plugins,
    });
    if (!r.success) throw Error(r.logs.join("\n"));
    bundles.push(await r.outputs[0].text());
  }
  fs.writeFileSync(
    path.join(out, "bundle.js"),
    bundles.join("\n") +
      `\nwindow.runChecks=()=>{const variants=Object.values(window.keymapVariants);if(variants.some(v=>JSON.stringify(v.names)!==JSON.stringify(variants[0].names)||JSON.stringify(v.tables)!==JSON.stringify(variants[0].tables)))throw Error('Browser key mismatch');return {variants:3,normalizations:12}};window.modifier=/Mac|iPhone|iPad|iPod/.test(navigator.platform)?4:2;`,
  );
  console.log("Built current/app/VPM keymap controls.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
