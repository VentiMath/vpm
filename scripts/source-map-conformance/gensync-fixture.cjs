"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const modules = path.join(__dirname, "node_modules");
module.exports = function stageBabel() {
  const dir = fs.mkdtempSync(path.join(modules, ".gensync-build-"));
  try {
    const scope = path.join(dir, "node_modules/@babel");
    fs.mkdirSync(scope, { recursive: true });
    fs.cpSync(path.join(modules, "@babel/core"), path.join(scope, "core"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(dir, "example.jsx"),
      "export const theme = () => <strong>Practice</strong>;",
    );
    fs.writeFileSync(
      path.join(dir, "babel.config.json"),
      JSON.stringify({
        parserOpts: { plugins: ["jsx"] },
        plugins: ["./rename.cjs"],
      }),
    );
    fs.writeFileSync(
      path.join(dir, "rename.cjs"),
      "module.exports=()=>({visitor:{Program(path){path.scope.rename('theme','contestTheme')}}});",
    );
    return dir;
  } catch (error) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw error;
  }
};
