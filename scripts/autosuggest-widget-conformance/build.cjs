"use strict";
const fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const out = path.join(__dirname, "node_modules/.vpm-widget");
  fs.mkdirSync(out, { recursive: true });
  const entry = path.join(out, "entry.mjs");
  fs.writeFileSync(
    entry,
    "import " + JSON.stringify(path.join(__dirname, "browser-entry.cjs")) + ";",
  );
  const result = await Bun.build({
    entrypoints: [entry],
    target: "browser",
    format: "iife",
    plugins: [
      {
        name: "fixture",
        setup(build) {
          build.onResolve(
            { filter: /^(react|react-dom(?:\/.*)?|vpm-under-test)$/ },
            ({ path: id }) => ({
              path:
                id === "vpm-under-test"
                  ? path.join(
                      process.env.VPM_WIDGET_ENTRY ||
                        path.resolve(
                          __dirname,
                          "../../packages/vreact-autosuggest",
                        ),
                      "index.cjs",
                    )
                  : require.resolve(id),
            }),
          );
        },
      },
    ],
  });
  if (!result.success) throw Error(result.logs.join("\n"));
  fs.writeFileSync(path.join(out, "bundle.js"), await result.outputs[0].text());
  console.log(out);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
