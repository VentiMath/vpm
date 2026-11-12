"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
(async () => {
  const app = "/Users/johnclyde/venti/ventimath-private";
  if (!fs.existsSync(app + "/.git")) {
    console.log(
      "private app comparison unavailable on this host; synthetic builds remain required",
    );
    return;
  }
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "vpaths-app-")),
  );
  try {
    const source = execFileSync("git", ["show", "origin/main:tsconfig.json"], {
      cwd: app,
      encoding: "utf8",
    });
    fs.writeFileSync(root + "/tsconfig.json", source);
    const config = JSON.parse(source),
      own = require("../../packages/vvite-tsconfig-paths"),
      current = (await import("vite-tsconfig-paths")).default,
      old = (await import("vite-tsconfig-paths-app")).default;
    const plugins = [own, current, old].map((factory) =>
      factory({ parseNative: false }),
    );
    for (const p of plugins) {
      await p.configResolved({ root, logger: { warn() {} } });
      await p.buildStart?.call({});
    }
    let n = 0;
    for (const key of Object.keys(config.compilerOptions.paths))
      for (const suffix of ["feature", "nested/contest"]) {
        const id = key.replace("*", suffix);
        const out = [];
        for (const p of plugins)
          out.push(
            await p.resolveId.call(
              { resolve: async (id) => ({ id }) },
              id,
              root + "/src/app/consumer.tsx",
              {},
            ),
          );
        assert.deepEqual(out, [out[0], out[0], out[0]], id);
        assert.ok(out[0]);
        n++;
      }
    console.log(
      n +
        " read-only actual app alias paths match both controls; private config is discarded",
    );
    for (const p of plugins) p.closeBundle?.();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
