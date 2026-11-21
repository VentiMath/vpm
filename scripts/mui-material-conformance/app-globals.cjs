"use strict";
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { compileFunction } = require("node:vm");
const { esbuild, peer } = require("./paths.cjs");
const dir = require("./globals-build.cjs");
const repo = process.argv[2],
  ref = process.argv[3] || "origin/main";
if (!repo) throw Error("Pass a VentiMath checkout and optional revision");
const git = (...args) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" });
const files = git("grep", "-l", "@mui/material/GlobalStyles", ref, "--", "src")
  .trim()
  .split("\n");
const createTheme = peer("mui-material-app/styles").createTheme;
const control = require(dir + "/app-upstream/globals-ssr.cjs");
const own = require(dir + "/app-vpm/globals-ssr.cjs");
// Emotion's prefixer emits this unrecognized property alongside color-scheme.
const rules = (html) =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) =>
    m[1].replace(/-webkit-print-color-scheme:[^;{}]+;/g, ""),
  );
let comparisons = 0;
for (const file of files) {
  const source = git("show", file);
  const elements = source.match(/<GlobalStyles\b[\s\S]*?\/>/g);
  assert.ok(elements?.length, file);
  const base =
    source.match(/\bconst baseStyles = \{[\s\S]*?\n\t\};/)?.[0] || "";
  for (const element of elements) {
    const js = esbuild.transformSync(base + "\nreturn " + element + ";", {
      loader: "tsx",
      jsxFactory: "capture",
    }).code;
    // Capture the original styles prop with its real closure and pass it to each package.
    const caller = compileFunction(js, [
      "capture",
      "GlobalStyles",
      "theme",
      "iframeTheme",
      "scroll",
      "navbarWidth",
      "panelWidth",
    ]);
    for (const mode of ["light", "dark"])
      for (const scroll of ["page", "content"]) {
        const theme = createTheme({ cssVariables: true, palette: { mode } });
        const styles = caller(
          (_, props) => props.styles,
          null,
          theme,
          theme,
          scroll,
          72,
          280,
        );
        const expected = rules(control.render(styles, theme));
        assert.ok(
          expected.some((rule) => rule.length),
          file,
        );
        assert.deepEqual(rules(own.render(styles, theme)), expected, file);
        comparisons++;
      }
  }
}
console.log(
  comparisons +
    " original global style renders matched across " +
    files.length +
    " app callers at " +
    ref,
);
