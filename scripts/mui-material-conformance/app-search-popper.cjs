"use strict";
const { execFileSync } = require("node:child_process");
const { esbuild } = require("./paths.cjs");
module.exports = function search(checkout, ref) {
  const source = execFileSync(
    "git",
    [
      "show",
      (ref || "origin/main") + ":src/@fuse/core/FuseSearch/FuseSearch.tsx",
    ],
    { cwd: checkout, encoding: "utf8" },
  );
  const panels = source.match(/<Popper\b[\s\S]*?<\/Popper>/g);
  if (panels?.length !== 2) throw Error("Review the toolbar search renderers");
  return esbuild.transformSync(
    "window.originalPanels=[" +
      panels
        .map(
          (jsx) =>
            "({React,Popper,Paper,Typography,popperNode,suggestionsNode,options,state,noResults,restContainerProps,key})=>(" +
            jsx +
            ")",
        )
        .join(",") +
      "]",
    { loader: "tsx" },
  ).code;
};
