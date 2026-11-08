"use strict";
const fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const out = path.join(__dirname, "node_modules/.vpm-react-themeable");
  fs.mkdirSync(out, { recursive: true });
  const bundles = [];
  for (const variant of ["upstream", "vpm"]) {
    const entry = path.join(out, variant + ".mjs");
    fs.writeFileSync(
      entry,
      `import setup from ${JSON.stringify(path.join(__dirname, "browser-entry.cjs"))}; setup(${JSON.stringify(variant)});`,
    );
    const result = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "iife",
      plugins: [
        {
          name: "themeable",
          setup(build) {
            build.onResolve({ filter: /^react-themeable$/ }, () => ({
              path:
                variant === "upstream"
                  ? require.resolve("react-themeable")
                  : path.join(
                      process.env.VPM_THEMEABLE_ENTRY ||
                        path.resolve(
                          __dirname,
                          "../../packages/vreact-themeable",
                        ),
                      "index.cjs",
                    ),
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
      `\nwindow.runChecks=async()=>{for(let i=0;i<200;i++){if(window.themeControls?.upstream&&window.themeControls?.vpm)return true;await new Promise(r=>setTimeout(r,10));}throw Error('Not mounted');};`,
  );
  console.log(out);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
