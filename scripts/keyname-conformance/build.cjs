"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const out = path.join(__dirname, "node_modules/.vpm-keyname");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const bundles = [];
  for (const variant of ["upstream", "vpm"]) {
    const entry = path.join(out, variant + ".mjs");
    fs.writeFileSync(
      entry,
      `import setup from ${JSON.stringify(path.join(__dirname, "browser-entry.cjs"))};window.keynameVariants??={};window.keynameVariants[${JSON.stringify(variant)}]=setup(${JSON.stringify(variant)});`,
    );
    const result = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "iife",
      plugins: [
        {
          name: "keyname",
          setup(build) {
            build.onResolve({ filter: /^w3c-keyname$/ }, () => ({
              path:
                variant === "vpm"
                  ? process.env.VPM_KEYNAME_ENTRY ||
                    path.resolve(
                      __dirname,
                      "../../packages/vw3c-keyname/index.cjs",
                    )
                  : require.resolve("w3c-keyname"),
            }));
          },
        },
      ],
    });
    if (!result.success) throw Error(result.logs.join("\n"));
    bundles.push(await result.outputs[0].text());
  }
  fs.writeFileSync(
    path.join(out, "bundle.js"),
    bundles.join("\n") +
      `\nwindow.runChecks=()=>{const {upstream,vpm}=window.keynameVariants;if(JSON.stringify(upstream.names)!==JSON.stringify(vpm.names)||JSON.stringify(upstream.tables)!==JSON.stringify(vpm.tables))throw Error('Key normalization mismatch');return {variants:2,normalizations:12}};window.modifier=/Mac|iP(hone|[oa]d)/.test(navigator.platform)?4:2;`,
  );
  console.log(out);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
