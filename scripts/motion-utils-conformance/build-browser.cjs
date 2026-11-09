"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { createRequire } = require("node:module");
const root = __dirname,
  control = createRequire(path.join(root, "package.json")),
  out = path.join(root, "node_modules/.vpm-motion-utils");
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const bundles = [];
  for (const variant of ["current", "current-vpm", "app", "app-vpm"]) {
    const legacy = variant.startsWith("app"),
      vpm = variant.endsWith("vpm");
    const aliases = {
      "motion-utils": vpm
        ? process.env.VMOTION_UTILS_BUILD_ENTRY ||
          path.resolve(root, "../../packages/vmotion-utils/index.mjs")
        : control.resolve(legacy ? "motion-utils-app" : "motion-utils"),
      "motion-dom": control.resolve(legacy ? "motion-dom-app" : "motion-dom"),
      "framer-motion": control.resolve(
        legacy ? "framer-motion-app" : "framer-motion",
      ),
    };
    const plugins = [
      {
        name: "exact-motion-controls",
        setup(b) {
          b.onResolve(
            { filter: /^(motion-utils|motion-dom|framer-motion)$/ },
            ({ path: name }) => ({ path: aliases[name] }),
          );
        },
      },
    ];
    const entry = path.join(out, variant + ".mjs");
    fs.writeFileSync(
      entry,
      `import {run} from ${JSON.stringify(path.join(root, "browser-entry.mjs"))};window.motionChecks??={};window.motionChecks[${JSON.stringify(variant)}]=run;`,
    );
    const browser = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "iife",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins,
    });
    assert.ok(browser.success, browser.logs.join("\n"));
    bundles.push(await browser.outputs[0].text());
    const node = await Bun.build({
      entrypoints: [path.join(root, "callers.mjs")],
      target: "node",
      format: "cjs",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins,
    });
    assert.ok(node.success, node.logs.join("\n"));
    fs.writeFileSync(
      path.join(out, variant + ".cjs"),
      await node.outputs[0].text(),
    );
  }
  bundles.push(
    `window.runMotionUtilities=async()=>{const rows=[];for(const [variant,run] of Object.entries(window.motionChecks))rows.push({variant,checks:await run()});return rows;}`,
  );
  fs.writeFileSync(path.join(out, "browser.js"), bundles.join("\n"));
  console.log(
    "Built unchanged Motion14/12 callers with original utilities and VPM; React19.3.1.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
