const assert = require("node:assert/strict");
require("./compare-scenes.cjs")(
  "css-baseline",
  async ({ send, wait, evaluate, baseUrl }) => {
    for (const version of ["app", "current"]) {
      let expected;
      for (const lib of ["upstream", "vpm"]) {
        const page = version + "-" + lib;
        await send("Page.navigate", { url: baseUrl + page });
        await wait("location.pathname==='/" + page + "' && window.draw");
        if (process.env.VPM_APP_CHECKOUT) {
          const { execFileSync } = require("node:child_process"),
            { esbuild } = require("./paths.cjs");
          const source = execFileSync(
            "git",
            [
              "show",
              (process.env.VPM_APP_REF || "origin/main") +
                ":src/contexts/RootThemeProvider.tsx",
            ],
            { cwd: process.env.VPM_APP_CHECKOUT, encoding: "utf8" },
          );
          const layer = source.match(/const wrapInLayer:[\s\S]*?\n};/);
          assert.ok(
            layer &&
              source.includes("<CssBaseline />") &&
              source.includes("rtlPlugin, wrapInLayer('mui')"),
          );
          await evaluate(
            esbuild.transformSync(layer[0] + "\nwindow.appLayer=wrapInLayer;", {
              loader: "tsx",
            }).code + ";true",
          );
        }
        const snapshots = [];
        for (const [mode, dir] of [
          ["light", "ltr"],
          ["dark", "rtl"],
          ["light", "ltr"],
        ]) {
          const snap = await evaluate(
            "draw(" +
              JSON.stringify(mode) +
              "," +
              JSON.stringify(dir) +
              ");snapshot()",
          );
          snapshots.push(snap);
          assert.deepEqual(snap.slice(0, 2), ["border-box", mode]);
          assert.equal(
            snap[3],
            mode === "light" ? "rgb(237, 237, 250)" : "rgb(25, 36, 50)",
          );
          assert.deepEqual(snap.slice(4, 8), [
            "18px",
            dir === "ltr" ? "9px" : "0px",
            dir === "rtl" ? "9px" : "0px",
            "750",
          ]);
          assert.ok(snap[8].length && snap[8].every(Boolean));
        }
        await send("Emulation.setEmulatedMedia", { media: "print" });
        assert.equal(await evaluate("snapshot()[3]"), "rgb(255, 255, 255)");
        await send("Emulation.setEmulatedMedia", { media: "screen" });
        await evaluate("draw('clear');true");
        assert.equal(await evaluate("snapshot()[0]"), "content-box");
        if (expected) assert.deepEqual(snapshots, expected);
        else expected = snapshots;
      }
    }
    console.log(
      "App cache layers, RTL/LTR, theme updates, print and unmount pass in Chrome.",
    );
  },
).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
