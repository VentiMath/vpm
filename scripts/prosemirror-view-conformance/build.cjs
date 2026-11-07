"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "../.."),
  out = path.join(__dirname, "node_modules/.vpm-view");
fs.mkdirSync(out, { recursive: true });
for (const [file, hash] of Object.entries(require("./upstream.json").sha256))
  if (
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
      .digest("hex") !== hash
  )
    throw Error("Changed upstream fixture: " + file);
function resolver(variant) {
  return {
    name: "view-model-graph",
    setup(b) {
      b.onResolve({ filter: /^selection-contract$/ }, () => ({
        path:
          process.env.APP_SELECTION_SOURCE ||
          path.join(__dirname, "selection-source.cjs"),
      }));
      b.onResolve({ filter: /^@tiptap\/react$/ }, () => ({
        path: require.resolve("@tiptap/core"),
      }));
      b.onResolve(
        {
          filter:
            /^(v?prosemirror-(view|model|state|transform)(\/decorations)?|@tiptap\/pm\/(view|state))$/,
        },
        ({ path: name }) => {
          const plain = name
            .replace("@tiptap/pm/", "prosemirror-")
            .replace(/^v/, "")
            .replace("/decorations", "");
          if (variant === "vpm")
            return {
              path:
                plain === "prosemirror-view"
                  ? process.env.VPM_VIEW_ENTRY ||
                    path.join(
                      root,
                      "packages/vprosemirror-view/decorations.cjs",
                    )
                  : path.join(root, "packages/v" + plain, "index.cjs"),
            };
          return {
            path: require.resolve(
              plain +
                (variant === "app" && plain !== "prosemirror-state"
                  ? "-app"
                  : ""),
            ),
          };
        },
      );
    },
  };
}
module.exports = { out, resolver };
if (require.main === module)
  (async () => {
    for (const variant of ["upstream", "app", "vpm"]) {
      for (const source of [
        "webtest-decoration.ts",
        "webtest-decoration-app.ts",
      ]) {
        const r = await Bun.build({
          entrypoints: [path.join(__dirname, "upstream", source)],
          format: "cjs",
          target: "node",
          plugins: [resolver(variant)],
        });
        if (!r.success) throw Error(r.logs.join("\n"));
        fs.writeFileSync(
          path.join(out, variant + "-" + source + ".cjs"),
          `const {JSDOM}=require('jsdom');global.document=new JSDOM('').window.document;const results=[];const describe=(n,f)=>f();const it=(name,f)=>{try{f();results.push({name,pass:true})}catch(e){results.push({name,pass:false,error:e.stack})}};\n` +
            (await r.outputs[0].text()) +
            `\nconsole.log(JSON.stringify(results));`,
        );
      }
      const entry = path.join(out, variant + "-api.mjs");
      fs.writeFileSync(
        entry,
        `export * as D from 'prosemirror-view';export * as M from 'prosemirror-model';export * as S from 'prosemirror-state';export * as T from 'prosemirror-transform';`,
      );
      const r = await Bun.build({
        entrypoints: [entry],
        format: "cjs",
        target: "node",
        plugins: [resolver(variant)],
      });
      if (!r.success) throw Error(r.logs.join("\n"));
      fs.writeFileSync(
        path.join(out, variant + "-api.cjs"),
        await r.outputs[0].text(),
      );
    }
    for (const variant of ["upstream", "app", "vpm"]) {
      const r = await Bun.build({
        entrypoints: [path.join(__dirname, "caller.cjs")],
        format: "cjs",
        target: "node",
        plugins: [resolver(variant)],
      });
      if (!r.success) throw Error(r.logs.join("\n"));
      fs.writeFileSync(
        path.join(out, variant + "-caller.cjs"),
        await r.outputs[0].text(),
      );
    }
    console.log(
      "Built current/app/VPM decoration models and unchanged test controls.",
    );
  })().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
