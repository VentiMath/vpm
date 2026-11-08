const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module");
const fixture = path.resolve(__dirname, "../react-table-conformance");
exports.fixture = fixture;
exports.peer = Module.createRequire(
  path.join(process.env.VPM_MATERIAL_CONSUMER || fixture, "package.json"),
);
exports.load = (file) => {
  const base = process.env.VPM_MATERIAL_CONSUMER || fixture;
  const m = new Module(path.join(base, path.basename(file)), module);
  m.filename = path.join(base, path.basename(file));
  m.paths = Module._nodeModulePaths(base);
  m._compile(fs.readFileSync(file, "utf8"), m.filename);
  return m.exports;
};
