"use strict";
const assert = require("node:assert/strict");
const base = require("./popper-build.cjs");
const normalize = (html) =>
  html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "").replace(
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
  );
let count = 0;
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
          normalize(api.render(props)),
        );
        assert.equal(actual, expected, JSON.stringify(props));
        // A render function receives the placement and, when asked, the
        // transition state its child must follow.
        for (const transition of [true, false]) {
          const [wanted, given] = bundles.map((api) =>
            normalize(api.renderFunction({ ...props, transition })),
          );
          assert.equal(given, wanted, JSON.stringify({ ...props, transition }));
          count++;
        }
        count++;
      }
  const shown = bundles[1].renderFunction({
    open: true,
    transition: true,
    disablePortal: true,
    anchorEl: null,
  });
  assert.match(shown, /data-options="TransitionProps placement"/);
  assert.match(shown, /data-in="true"/);
  assert.match(shown, /data-callbacks="function function"/);
  assert.doesNotMatch(shown, / transition=/);
}
console.log(
  count +
    " Popper server-render comparisons passed for inline, portaled and transition panels.",
);
