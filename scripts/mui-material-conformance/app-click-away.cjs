"use strict";
const { execFileSync } = require("node:child_process");
const { esbuild } = require("./paths.cjs");
// Compile just the callbacks so the unchanged app code runs inside the Chrome event fixture.
module.exports = function appCallbacks(checkout, ref = "origin/main") {
  const read = (file) =>
    execFileSync("git", ["show", ref + ":" + file], {
      cwd: checkout,
      encoding: "utf8",
    });
  const search = read("src/@fuse/core/FuseSearch/FuseSearch.tsx");
  const navbar = read(
    "src/components/theme-layouts/layout1/components/navbar/style-2/NavbarStyle2Content.tsx",
  );
  const searchCallback = search.match(
    /function handleClickAway\([\s\S]*?\n\t}/,
  )?.[0];
  const sideCallback = navbar.match(
    /<ClickAwayListener onClickAway=\{([^}]+)\}>/,
  )?.[1];
  if (!searchCallback || !sideCallback)
    throw Error("App callback changed; review the click-away fixture");
  const script = `
    window.calls=[];
    const state={opened:true}, suggestionsNode={current:document.querySelector('#suggestion')};
    const hideSearch=()=>window.calls.push('search');
    const setPanelOpen=open=>window.calls.push(open);
    ${searchCallback}
    window.searchHandler=handleClickAway;
    window.panelHandler=${sideCallback};
  `;
  return esbuild.transformSync(script, { loader: "ts" }).code;
};
