"use strict";
const { execFileSync } = require("node:child_process");
const { esbuild } = require("./paths.cjs");
module.exports = function menuSource(checkout, ref, kind) {
  const file =
    "src/@fuse/core/FuseNavigation/horizontal/types/FuseNavHorizontal" +
    kind +
    ".tsx";
  const source = execFileSync(
    "git",
    ["show", (ref || "origin/main") + ":" + file],
    { cwd: checkout, encoding: "utf8" },
  );
  const element = source.match(/<Grow\b[\s\S]*?<\/Grow>/)?.[0];
  if (!element) throw Error("Review the Grow call site in " + file);
  return esbuild.transformSync(
    "window.renderOriginal = ({React,Grow,Paper,clsx,FuseNavItem,opened,item,dense,nestedLevel,handleToggle})=>(" +
      element +
      ");",
    { loader: "tsx" },
  ).code;
};
