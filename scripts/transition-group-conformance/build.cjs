"use strict";
require("./verify.cjs");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const peer = process.env.VPM_TRANSITION_CONSUMER
    ? require("node:module").createRequire(
        path.join(process.env.VPM_TRANSITION_CONSUMER, "package.json"),
      )
    : require;
  const out = path.join(__dirname, "node_modules/.vpm-transitions");
  fs.mkdirSync(out, { recursive: true });
  const all = [];
  for (const variant of ["upstream", "vpm"]) {
    const entry = path.join(out, variant + ".mjs");
    fs.writeFileSync(
      entry,
      `import setup from ${JSON.stringify(path.join(__dirname, "browser-entry.mjs"))};setup(${JSON.stringify(variant)});`,
    );
    const result = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "iife",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [
        {
          name: "transition-controls",
          setup(build) {
            build.onResolve(
              {
                filter:
                  /^(react|react-dom(?:\/.*)?|react-transition-group(?:\/.*)?)$/,
              },
              ({ path: id }) => ({
                path:
                  variant === "vpm" && id.startsWith("react-transition-group")
                    ? path.join(
                        process.env.VPM_TRANSITION_ENTRY ||
                          path.resolve(
                            __dirname,
                            "../../packages/vreact-transition-group",
                          ),
                        (id.split("/")[1] || "index") + ".cjs",
                      )
                    : id.startsWith("react-transition-group")
                      ? require.resolve(id)
                      : peer.resolve(id),
              }),
            );
          },
        },
      ],
    });
    assert.ok(result.success, result.logs.join("\n"));
    all.push(await result.outputs[0].text());
  }
  fs.writeFileSync(path.join(out, "bundle.js"), all.join("\n"));
  console.log(
    "Built unchanged MUI caller controls and transition contract browser bundles.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
