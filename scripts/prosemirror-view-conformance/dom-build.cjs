"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const { out, resolver } = require("./build.cjs");
(async () => {
  const chunks = [];
  for (const variant of ["upstream", "app", "vpm"]) {
    const extra = {
      name: "readonly-entry",
      setup(b) {
        b.onResolve({ filter: /^vpm-readonly$/ }, () => ({
          path:
            process.env.VPM_READONLY_ENTRY ||
            path.resolve(
              __dirname,
              "../../packages/vprosemirror-view/readonly.cjs",
            ),
        }));
      },
    };
    const entry = path.join(out, variant + "-dom.mjs");
    fs.writeFileSync(
      entry,
      `import setup from ${JSON.stringify(path.join(__dirname, "dom-cases.cjs"))};window.domVariants??={};window.domVariants[${JSON.stringify(variant)}]=setup(${JSON.stringify(variant)});`,
    );
    const build = await Bun.build({
      entrypoints: [entry],
      format: "iife",
      target: "browser",
      plugins: [extra, resolver(variant)],
    });
    if (!build.success) throw Error(build.logs.join("\n"));
    chunks.push(await build.outputs[0].text());
  }
  fs.writeFileSync(
    path.join(out, "dom-bundle.js"),
    chunks.join("\n") +
      "\nwindow.runChecks = () => window.domVariants.vpm.runComparisons(window.domVariants);",
  );
  console.log("Built read-only current/app/VPM browser controls.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
