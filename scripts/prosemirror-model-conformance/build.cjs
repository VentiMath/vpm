"use strict";
const path = require("node:path"),
  fs = require("node:fs"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "../.."),
  out = path.join(__dirname, "node_modules/.vpm-model");
fs.mkdirSync(out, { recursive: true });
const variant = process.argv[2] || "vpm";
const sources = require("./upstream.json");
for (const [file, hash] of Object.entries(sources.sha256)) {
  if (
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, "upstream", file)))
      .digest("hex") !== hash
  )
    throw Error("Upstream test source changed: " + file);
}
const entry =
  variant === "vpm"
    ? process.env.VPM_MODEL_ENTRY ||
      path.join(root, "packages/vprosemirror-model/index.cjs")
    : require.resolve(
        variant === "app" ? "prosemirror-model-app" : "prosemirror-model",
      );
const plugins = [
  {
    name: "model",
    setup(build) {
      build.onResolve({ filter: /^prosemirror-model$/ }, () => ({
        path: entry,
      }));
    },
  },
];
(async () => {
  for (const file of [
    ...Object.keys(sources.sha256)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => "upstream/" + f),
    "callers.cjs",
  ]) {
    const result = await Bun.build({
      entrypoints: [path.join(__dirname, file)],
      target: "node",
      format: "cjs",
      external: ["jsdom", "node:test"],
      plugins,
    });
    if (!result.success) throw Error(result.logs.join("\n"));
    const name =
      variant + "-" + path.basename(file).replace(".ts", ".test.cjs");
    fs.writeFileSync(
      path.join(out, name),
      "const {describe,it}=require('node:test');\n" +
        (await result.outputs[0].text()) +
        (file === "callers.cjs"
          ? `\nconst {JSDOM}=require('jsdom');const dom=new JSDOM('<!doctype html><body></body>',{pretendToBeVisual:true});for(const key of ['window','document','navigator','Node','HTMLElement','MutationObserver','DOMParser','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])Object.defineProperty(globalThis,key,{value:typeof dom.window[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?dom.window[key].bind(dom.window):dom.window[key],configurable:true});try{console.log(JSON.stringify(module.exports(dom.window.document)));}finally{dom.window.close();}`
          : ""),
    );
  }
  const source = path.join(out, variant + "-browser-entry.mjs");
  fs.writeFileSync(
    source,
    `import exercise from ${JSON.stringify(path.join(__dirname, "callers.cjs"))};window.modelResults=window.modelResults||{};window.modelResults[${JSON.stringify(variant)}]=exercise(document);`,
  );
  const bundle = await Bun.build({
    entrypoints: [source],
    target: "browser",
    format: "iife",
    plugins,
  });
  if (!bundle.success) throw Error(bundle.logs.join("\n"));
  fs.writeFileSync(
    path.join(out, variant + "-browser.js"),
    await bundle.outputs[0].text(),
  );
  console.log("Built " + variant + " contracts and Tiptap caller controls.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
