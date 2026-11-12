const path = require("node:path");
(async () => {
  const fixture = path.resolve(
      __dirname,
      "../hook-form-conformance/node_modules",
    ),
    aliases = {
      react: require.resolve(fixture + "/react"),
      "react-dom": require.resolve(fixture + "/react-dom"),
      "react-dom/client": require.resolve(fixture + "/react-dom/client"),
      "vfullcalendar-core": path.resolve(
        __dirname,
        "../../packages/vfullcalendar-core/index.js",
      ),
      "vfullcalendar-core/protected-api": path.resolve(
        __dirname,
        "../../packages/vfullcalendar-core/protected-api.js",
      ),
      "vfull-ui-headless-calendar": path.resolve(
        __dirname,
        "../../packages/vfull-ui-headless-calendar/index.js",
      ),
    };
  const result = await Bun.build({
    entrypoints: [path.join(__dirname, "browser-entry.mjs")],
    outdir: path.join(__dirname, "node_modules/.vpm-time-zone/vpm"),
    naming: "browser-entry.js",
    target: "browser",
    format: "esm",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    plugins: [
      {
        name: "current-react",
        setup(build) {
          build.onResolve(
            {
              filter:
                /^(react|react-dom(?:\/client)?|vfullcalendar-core(?:\/protected-api)?|vfull-ui-headless-calendar)$/,
            },
            (args) => ({ path: aliases[args.path] }),
          );
        },
      },
    ],
  });
  if (!result.success) throw Error(result.logs.join("\n"));
})();
