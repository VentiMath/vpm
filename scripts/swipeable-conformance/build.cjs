"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  { createHash } = require("node:crypto");
(async () => {
  const out = path.join(__dirname, "node_modules/.vpm-swipeable");
  fs.mkdirSync(out, { recursive: true });
  for (const [file, hash] of Object.entries(require("./upstream/hashes.json")))
    if (
      createHash("sha256")
        .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
        .digest("hex") !== hash
    )
      throw Error("Changed upstream fixture " + file);
  for (const variant of ["upstream", "vpm"]) {
    const source = fs
      .readFileSync(
        path.join(__dirname, "upstream/useSwipeable.spec.tsx"),
        "utf8",
      )
      .replace('"../src/index"', '"fixture-api"')
      .replace('"../src/types"', '"fixture-api"')
      .replace(
        '"./helpers"',
        JSON.stringify(path.join(__dirname, "upstream/helpers/index.ts")),
      );
    const adjusted =
      variant === "vpm"
        ? source.replace(
            /(addEventListenerSpy\??\.mock.calls.length\)\.toBe\()3(\))/g,
            "$14$2",
          )
        : source;
    const entry = path.join(out, variant + ".tsx");
    fs.writeFileSync(entry, adjusted);
    const result = await Bun.build({
      entrypoints: [entry],
      target: "node",
      format: "cjs",
      packages: "external",
      jsx: { development: false },
    });
    if (!result.success) throw Error(result.logs.join("\n"));
    fs.writeFileSync(
      path.join(out, variant + ".cjs"),
      await result.outputs[0].text(),
    );
  }
  fs.writeFileSync(
    path.join(out, "snapshots.snap"),
    fs
      .readFileSync(
        path.join(
          __dirname,
          "upstream/__snapshots__/useSwipeable.spec.tsx.snap",
        ),
        "utf8",
      )
      .replace(
        "https://goo.gl/fbAQLP",
        "https://jestjs.io/docs/snapshot-testing",
      ),
  );

  const bundles = [];
  for (const variant of ["upstream", "vpm"]) {
    const entry = path.join(out, variant + "-browser.mjs");
    fs.writeFileSync(
      entry,
      `import setup from ${JSON.stringify(path.join(__dirname, "browser-entry.cjs"))};setup(${JSON.stringify(variant)});`,
    );
    const result = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      format: "iife",
      plugins: [
        {
          name: "swipeable-controls",
          setup(build) {
            build.onResolve({ filter: /^fixture-api$/ }, () => ({
              path:
                variant === "upstream"
                  ? require.resolve("react-swipeable")
                  : require.resolve(
                      process.env.VPM_SWIPEABLE_ENTRY ||
                        path.resolve(
                          __dirname,
                          "../../packages/vreact-swipeable",
                        ),
                    ),
            }));
            build.onResolve(
              { filter: /^react(?:\/|$)|^react-dom(?:\/|$)/ },
              (args) => ({
                path: require.resolve(args.path, {
                  paths: [process.env.VPM_REACT_ROOT || __dirname],
                }),
              }),
            );
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
      "\nwindow.runChecks=()=>Boolean(window.swipeControls?.upstream&&window.swipeControls?.vpm);",
  );
  console.log(
    "Hashed upstream suite compiled; VPM listener-count assertions account for touchcancel.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
