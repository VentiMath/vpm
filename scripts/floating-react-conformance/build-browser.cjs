"use strict";
const path = require("node:path");
const releaseModules = process.env.VPM_FLOATING_RELEASE_MODULES;
(async () => {
  for (const variant of ["upstream", "vpm"]) {
    const result = await Bun.build({
      entrypoints: [path.join(__dirname, "browser-entry.tsx")],
      target: "browser",
      format: "esm",
      plugins:
        variant === "upstream"
          ? []
          : [
              {
                name: "VPM React positioning",
                setup(build) {
                  build.onResolve({ filter: /^@floating-ui\/react$/ }, () => ({
                    path: releaseModules
                      ? path.join(releaseModules, "vfloating-ui-react/runtime.mjs")
                      : path.resolve(__dirname, "../../packages/vfloating-ui-react/runtime.mjs"),
                  }));
                  build.onResolve(
                    { filter: /^react(?:-dom)?(?:\/.*)?$/ },
                    ({ path: specifier }) => ({
                      path: require.resolve(specifier, { paths: [releaseModules || __dirname] }),
                    }),
                  );
                },
              },
            ],
    });
    if (!result.success) throw new Error(result.logs.join("\n"));
    await Bun.write(
      path.join(process.argv[2], variant + ".mjs"),
      result.outputs[0],
    );
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
