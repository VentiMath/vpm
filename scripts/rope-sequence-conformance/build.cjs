"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const out = path.join(__dirname, "node_modules/.vpm-rope");
fs.mkdirSync(out, { recursive: true });
for (const [file, hash] of Object.entries(require("./upstream.json").sha256))
  if (
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
      .digest("hex") !== hash
  )
    throw Error("Upstream fixture changed");
(async () => {
  for (const variant of ["upstream", "vpm"]) {
    const r = await Bun.build({
      entrypoints: [path.join(__dirname, "upstream/test.js")],
      target: "node",
      format: "cjs",
      plugins: [
        {
          name: "rope",
          setup(b) {
            b.onResolve({ filter: /^\.\/index\.js$/ }, () => ({
              path:
                variant === "vpm"
                  ? process.env.VPM_ROPE_ENTRY ||
                    path.resolve(
                      __dirname,
                      "../../packages/vrope-sequence/index.cjs",
                    )
                  : require.resolve("rope-sequence"),
            }));
          },
        },
      ],
    });
    if (!r.success) throw Error(r.logs.join("\n"));
    fs.writeFileSync(
      path.join(out, variant + ".cjs"),
      "let seed=42;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);\n" +
        (await r.outputs[0].text()),
    );
  }
  const bundles = [];
  for (const version of ["prosemirror-history", "prosemirror-history-app"])
    for (const variant of ["upstream", "vpm"]) {
      const entry = path.join(out, version + "-" + variant + ".mjs");
      fs.writeFileSync(
        entry,
        `import run from ${JSON.stringify(path.join(__dirname, "scenario.cjs"))};import {Schema} from "prosemirror-model";import {EditorState} from "prosemirror-state";import * as H from ${JSON.stringify(version)};import R from "rope-sequence";window.ropeResults??={};window.ropeResults[${JSON.stringify(version + "-" + variant)}]=run(H,Schema,EditorState,R);`,
      );
      const r = await Bun.build({
        entrypoints: [entry],
        target: "browser",
        format: "iife",
        plugins: [
          {
            name: "rope-browser",
            setup(b) {
              b.onResolve({ filter: /^rope-sequence$/ }, () => ({
                path:
                  variant === "vpm"
                    ? process.env.VPM_ROPE_ENTRY ||
                      path.resolve(
                        __dirname,
                        "../../packages/vrope-sequence/index.cjs",
                      )
                    : require.resolve("rope-sequence"),
              }));
            },
          },
        ],
      });
      if (!r.success) throw Error(r.logs.join("\n"));
      bundles.push(await r.outputs[0].text());
    }
  fs.writeFileSync(path.join(out, "bundle.js"), bundles.join("\n"));
  console.log(
    "Verified unchanged rope tests and built Node/browser history controls.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
