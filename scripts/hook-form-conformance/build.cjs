const path = require("node:path");
(async () => {
  for (const [variant, entry] of [
    ["upstream", require.resolve("./node_modules/react-hook-form")],
    ["app", require.resolve("./node_modules/react-hook-form-app")],
    [
      "vpm",
      process.env.VFORM_ENTRY ||
        path.resolve(__dirname, "../../packages/vreact-hook-form/index.cjs"),
    ],
  ]) {
    const aliases = {
      "form-api": entry,
      "@hookform/resolvers/zod":
        variant === "vpm" && process.env.VRESOLVERS_ZOD
          ? process.env.VRESOLVERS_ZOD
          : require.resolve("./node_modules/@hookform/resolvers/zod"),
      react: require.resolve("./node_modules/react"),
      "react-dom/client": require.resolve("./node_modules/react-dom/client"),
      "react-dom": require.resolve("./node_modules/react-dom"),
    };
    const result = await Bun.build({
      entrypoints: [path.join(__dirname, "browser-entry.mjs")],
      target: "browser",
      format: "esm",
      naming: "browser-entry.js",
      outdir: path.join(__dirname, "node_modules/.vpm-hook-form", variant),
      define: {
        "process.env.NODE_ENV": JSON.stringify("development"),
        __VARIANT__: JSON.stringify(variant),
      },
      plugins: [
        {
          name: "form-controls",
          setup(build) {
            build.onResolve(
              {
                filter:
                  /^(@hookform\/resolvers\/zod|form-api|react|react-dom(?:\/client)?)$/,
              },
              (args) => ({ path: aliases[args.path] }),
            );
          },
        },
      ],
    });
    if (!result.success) throw Error(result.logs.join("\n"));
  }
})();
