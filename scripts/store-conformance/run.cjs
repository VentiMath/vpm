"use strict";
const path = require("node:path");
console.log(
  require("./cases.cjs").compare(
    require(
      process.env.VPM_STORE_ENTRY ||
        path.resolve(__dirname, "../../packages/vtanstack-store"),
    ),
    require("@tanstack/store"),
  ),
);
