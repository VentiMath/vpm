"use strict";
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
module.exports = function (own, version = "current") {
  const alias = {
    "@mui/system": require.resolve(
      version === "current" ? "@mui/system" : "mui-system-app",
    ),
    "@mui/private-theming": own
      ? root + "/packages/vmui-private-theming/index.cjs"
      : require.resolve(
          version === "current"
            ? "@mui/private-theming"
            : "mui-private-theming-app",
        ),
    "@mui/styled-engine": own
      ? root + "/packages/vmui-styled-engine"
      : require.resolve(
          version === "current"
            ? "@mui/styled-engine"
            : "mui-styled-engine-app",
        ),
  };
  if (own) {
    alias["stylis-plugin-rtl"] = root + "/packages/vstylis-plugin-rtl";
    alias.vcssjanus = root + "/packages/vcssjanus";
    const fs = require("node:fs");
    for (const name of fs.readdirSync(root + "/packages"))
      if (name.startsWith("vemotion-") || name === "vstylis")
        alias[name] = root + "/packages/" + name;
  }
  if (own)
    for (const name of [
      "react",
      "styled",
      "cache",
      "serialize",
      "utils",
      "hash",
      "memoize",
      "unitless",
      "sheet",
      "weak-memoize",
      "is-prop-valid",
      "use-insertion-effect-with-fallbacks",
    ])
      alias["@emotion/" + name] = root + "/packages/vemotion-" + name;
  return alias;
};
