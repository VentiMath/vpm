"use strict";
const { execFileSync } = require("node:child_process");
const { esbuild } = require("./paths.cjs");
module.exports = (repo, ref) => {
  const read = (f) =>
    execFileSync("git", ["show", (ref || "origin/main") + ":" + f], {
      cwd: repo,
      encoding: "utf8",
    });
  const caller = read(
      "src/components/theme-layouts/components/AdjustFontSize.tsx",
    ),
    theme = read("src/@fuse/default-settings/FuseDefaultSettings.ts");
  const extract = (source, re) => {
    const m = source.match(re);
    if (!m) throw Error("Review the VentiMath font-size fixture");
    return m[0];
  };
  const marks = extract(caller, /const marks = \[[\s\S]*?\];/);
  const state = extract(
    caller,
    /const \[fontSize, setFontSize\] = useState\([^;]+;/,
  );
  const commit = extract(
    caller,
    /function changeHtmlFontSize\(\) \{[\s\S]*?\n  \}/,
  );
  const slider = extract(caller, /<Slider\b[\s\S]*?\/>/);
  const component = extract(theme, /MuiSlider: \{[\s\S]*?\n    \},/);
  const spacing = extract(theme, /function spacing\([^)]*\) \{[\s\S]*?\n\}/);
  return esbuild.transformSync(
    marks +
      "\n" +
      spacing +
      "\nwindow.appOverrides={" +
      component +
      "};window.OriginalFont=function OriginalFont({React,Slider}){const {useState}=React;" +
      state +
      "\n" +
      commit +
      "\nreturn (" +
      slider +
      ");}",
    { loader: "tsx" },
  ).code;
};
