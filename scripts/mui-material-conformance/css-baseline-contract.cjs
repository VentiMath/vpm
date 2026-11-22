const assert = require("node:assert/strict"),
  base = require("./css-baseline-build.cjs");
let count = 0;
for (const version of ["app", "current"]) {
  const [control, own] = ["upstream", "vpm"].map((lib) =>
    require(base + "/" + version + "-" + lib + "/css-baseline-ssr.cjs"),
  );
  for (const mode of [undefined, "light", "dark"])
    for (const selector of [undefined, "media", "class", "data"])
      for (const override of [false, true])
        for (const scheme of [undefined, false, true]) {
          const props = { mode, selector, override, scheme };
          const markup = own.prepare(props)();
          const normalize = (x) =>
            x
              .replace(/-webkit-print-color-scheme:[^;{}]+;/g, "")
              .replace(/data-emotion="[^"]+"/g, "data-emotion");
          assert.equal(
            normalize(markup),
            normalize(control.prepare(props)()),
            JSON.stringify([version, props]),
          );
          assert.ok(
            markup.includes("box-sizing:border-box") &&
              markup.endsWith('<strong class="accent">Practice</strong>'),
          );
          count++;
        }
}
console.log(count + " document baseline SSR comparisons passed.");
