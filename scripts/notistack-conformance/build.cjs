const path = require("node:path"),
  fs = require("node:fs");
(async () => {
  const here = __dirname,
    base = path.resolve(here, "../../packages"),
    out = path.join(here, "node_modules/.vpm-notistack");
  fs.mkdirSync(out, { recursive: true });
  for (const [variant, entry] of [
    ["upstream", require.resolve("./node_modules/notistack")],
    [
      "vpm",
      process.env.VNOTISTACK_ENTRY || path.join(base, "vnotistack/index.cjs"),
    ],
  ]) {
    const aliases = {
      notistack: entry,
      react: require.resolve("./node_modules/react"),
      "react-dom": require.resolve("./node_modules/react-dom"),
      "react-dom/client": require.resolve("./node_modules/react-dom/client"),
      "react-dom/server": require.resolve("./node_modules/react-dom/server"),
    };
    if (!process.env.VNOTISTACK_ENTRY)
      Object.assign(aliases, {
        vgoober: path.join(base, "vgoober/index.cjs"),
        vclsx: path.join(base, "vclsx/index.cjs"),
        "vreact-transition-group": path.join(
          base,
          "vreact-transition-group/index.cjs",
        ),
      });
    for (const target of ["browser", "node"]) {
      const result = await Bun.build({
        entrypoints: [
          target === "browser"
            ? path.join(here, "browser-entry.mjs")
            : path.join(here, "entry.mjs"),
        ],
        target,
        format: target === "node" ? "cjs" : "esm",
        naming: target === "node" ? "api.cjs" : "browser-entry.js",
        outdir: path.join(out, variant),
        define: {
          "process.env.NODE_ENV": JSON.stringify(
            process.env.VNOTISTACK_MODE || "production",
          ),
          __VARIANT__: JSON.stringify(variant),
        },
        plugins: [
          {
            name: "controls",
            setup(build) {
              build.onResolve(
                {
                  filter:
                    /^(notistack|react|react-dom(?:\/client|\/server)?|vgoober|vclsx|vreact-transition-group)$/,
                },
                (args) =>
                  aliases[args.path] ? { path: aliases[args.path] } : undefined,
              );
            },
          },
        ],
      });
      if (!result.success) throw Error(result.logs.join("\n"));
    }
  }
})();
