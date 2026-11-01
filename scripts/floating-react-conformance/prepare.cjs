"use strict";
const fs = require("node:fs"),
  path = require("node:path");
for (const name of ["vfloating-ui-react", "vfloating-ui-react-dom"]) {
  const modules = path.resolve(
    __dirname,
    "../../packages",
    name,
    "node_modules",
  );
  fs.mkdirSync(modules, { recursive: true });
  for (const peer of ["react", "react-dom"]) {
    const target = path.join(__dirname, "node_modules", peer),
      link = path.join(modules, peer);
    if (!fs.existsSync(link)) fs.symlinkSync(target, link, "dir");
  }
}
