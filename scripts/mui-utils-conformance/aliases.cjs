"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  root = path.resolve(__dirname, "../..");
module.exports = (own, version = "current", browser = false) => {
  const alias = { vclsx: root + "/packages/vclsx" };
  for (const [name, pkg] of [
    ["@mui/system", version === "current" ? "@mui/system" : "mui-system-app"],
    [
      "@mui/material",
      version === "current" ? "@mui/material" : "mui-material-app",
    ],
    ["@mui/utils", version === "current" ? "@mui/utils" : "mui-utils-app"],
  ]) {
    const base = path.dirname(require.resolve(pkg));
    if (name === "@mui/utils" && own) {
      alias[name] =
        root + "/packages/vmui-utils/index." + (browser ? "mjs" : "cjs");
      for (const key of Object.keys(
        require(root + "/packages/vmui-utils/package.json").exports,
      )) {
        if (key === "." || key === "./package.json") continue;
        alias[name + "/" + key.slice(2)] =
          root +
          "/packages/vmui-utils/" +
          key.slice(2) +
          "." +
          (browser ? "mjs" : "cjs");
      }
      continue;
    }
    alias[name] =
      browser && fs.existsSync(base + "/esm") ? base + "/esm" : base;
  }
  return alias;
};
