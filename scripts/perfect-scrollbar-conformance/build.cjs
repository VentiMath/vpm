const path = require("node:path"),
  fs = require("node:fs");
(async () => {
  for (const variant of ["upstream", "vpm"]) {
    const dir = path.join(__dirname, "node_modules/.vpm-scrollbar", variant);
    fs.mkdirSync(dir, { recursive: true });
    const entry =
      variant === "upstream"
        ? require.resolve("./node_modules/perfect-scrollbar")
        : process.env.VPERFECT_ENTRY ||
          path.resolve(
            __dirname,
            "../../packages/vperfect-scrollbar/index.cjs",
          );
    const css =
      variant === "upstream"
        ? path.join(
            __dirname,
            "node_modules/perfect-scrollbar/css/perfect-scrollbar.css",
          )
        : path.join(path.dirname(entry), "css/perfect-scrollbar.css");
    fs.copyFileSync(css, path.join(dir, "scrollbar.css"));
    const aliases = {
      "perfect-scrollbar": entry,
      react: require.resolve("./node_modules/react"),
      "react-dom/client": require.resolve("./node_modules/react-dom/client"),
      "react-dom": require.resolve("./node_modules/react-dom"),
    };
    const result = await Bun.build({
      entrypoints: [path.join(__dirname, "browser-entry.mjs")],
      outdir: dir,
      target: "browser",
      format: "esm",
      define: {
        "process.env.NODE_ENV": '"development"',
        __VARIANT__: JSON.stringify(variant),
      },
      plugins: [
        {
          name: "controls",
          setup(build) {
            build.onResolve(
              { filter: /^(perfect-scrollbar|react|react-dom(?:\/client)?)$/ },
              (args) => ({ path: aliases[args.path] }),
            );
          },
        },
      ],
    });
    if (!result.success) throw Error(result.logs.join("\n"));
  }
})();
