"use strict";
const assert = require("node:assert/strict");
const base = require("./popper-build.cjs");
for (const version of ["app", "current"]) {
  const bundles = ["upstream", "vpm"].map((lib) =>
    require(base + "/" + version + "-" + lib + "/popper-ssr.cjs"),
  );
  assert.doesNotThrow(() =>
    bundles[1].render({
      open: true,
      disablePortal: true,
      anchorEl: () => {
        throw Error("Anchor read during server render");
      },
    }),
  );
  for (const open of [true, false])
    for (const keepMounted of [true, false])
      for (const disablePortal of [true, false]) {
        const props = { open, keepMounted, disablePortal, anchorEl: null };
        const [expected, actual] = bundles.map((api) =>
          api
            .render(props)
            .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
            .replace(
              /class="[^"]*"/g,
              (match) =>
                'class="' +
                match
                  .slice(7, -1)
                  .split(" ")
                  .filter((c) => !c.startsWith("css-"))
                  .sort()
                  .join(" ") +
                '"',
            ),
        );
        assert.equal(actual, expected, JSON.stringify(props));
      }
}
console.log(
  "16 Popper server-render comparisons passed for inline and portaled panels.",
);
