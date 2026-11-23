"use strict";
// Only the public color values are compatibility data. Module wrappers and
// declarations are generated here; no upstream executable source is copied.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const {peer, root} = require("./paths.cjs");
const colors = peer("mui-material-current/colors"), dir = root + "/packages/vmui-material/colors";
fs.mkdirSync(dir, {recursive:true});
const names = Object.keys(colors).sort();
for (const name of names) {
  const values = colors[name];
  fs.writeFileSync(`${dir}/${name}.data.cjs`, '"use strict";\n// Material color data; see PROVENANCE.json and LICENSE.\nmodule.exports = ' + JSON.stringify(values, null, 2) + ';\n');
  fs.writeFileSync(`${dir}/${name}.cjs`, `"use strict";\nmodule.exports = { __esModule: true, default: require("./${name}.data.cjs") };\n`);
  fs.writeFileSync(`${dir}/${name}.mjs`, `import color from "./${name}.data.cjs";\nexport default color;\n`);
  const declaration = `declare const ${name}: {\n` + Object.entries(values).map(([key,value]) => `  readonly ${JSON.stringify(key)}: ${JSON.stringify(value)};`).join("\n") + `\n};\nexport default ${name};\n`;
  for (const ext of ["cts","mts"]) fs.writeFileSync(`${dir}/${name}.d.${ext}`, declaration);
}
fs.writeFileSync(dir+"/index.cjs", '"use strict";\n' + names.map(name => `exports.${name} = require("./${name}.cjs").default;`).join("\n") + "\n");
fs.writeFileSync(dir+"/index.mjs", names.map(name => `export { default as ${name} } from "./${name}.mjs";`).join("\n") + "\n");
for (const [ext,js] of [["mts","mjs"],["cts","cjs"]]) fs.writeFileSync(`${dir}/index.d.${ext}`, names.map(name=>`export { default as ${name} } from "./${name}.${js}";`).join("\n")+"\n");
const provenance = JSON.parse(fs.readFileSync(root+"/packages/vmui-material/PROVENANCE.json"));
provenance.colorData = {name:"@mui/material",version:"9.6.0",source:"https://github.com/mui/material-ui/tree/v9.6.0/packages/mui-material/src/colors",license:"MIT",kind:"Public static color values only; independently generated module wrappers and declarations",sha256:crypto.createHash("sha256").update(JSON.stringify(Object.fromEntries(names.map(n=>[n,colors[n]])))).digest("hex")};
fs.writeFileSync(root+"/packages/vmui-material/PROVENANCE.json",JSON.stringify(provenance,null,2)+"\n");
console.log(`Generated ${names.length} public color exports from pinned static data.`);
