"use strict";
const assert = require("node:assert/strict"),
  base = require("./breadcrumbs-build.cjs");
function markup(html) {
  // Compare the ellipsis by its accessible container. Each implementation draws
  // its own three dots. ButtonBase also has an inert SSR ripple span in VPM.
  return html
    .replace(/(<svg[^>]*MuiSvgIcon-root[^>]*>)[\s\S]*?<\/svg>/g, "$1</svg>")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<span class="MuiTouchRipple-root"[^>]*><\/span>/g, "")
    .replace(
      / class="([^"]*)"/g,
      (_, list) =>
        ' class="' +
        [...new Set(list.split(" ").filter((name) => name && !name.startsWith("css-")))]
          .sort()
          .join(" ") +
        '"',
    )
    .replace(
      /<([\w-]+)([^>]*)>/g,
      (_, tag, attrs) =>
        "<" +
        tag +
        [...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)]
          .map((x) => " " + x[1] + '="' + x[2] + '"')
          .sort()
          .join("") +
        ">",
    );
}

let checks = 0;
for (const version of ["current", "app"]) {
  const own = require(base + "/" + version + "-vpm/breadcrumbs-ssr.cjs"),
    up = require(base + "/" + version + "-upstream/breadcrumbs-ssr.cjs");
  for (const count of [0, 1, 3, 4, 5, 6])
    for (const limit of [2, 4, 8])
      for (const [before, after] of [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
        [2, 1],
      ])
        for (const custom of [false, true]) {
          const props = {
            count,
            limit,
            before,
            after,
            custom,
            last: "Émilie du Châtelet",
            expandText: "More pages",
          };
          assert.equal(
            markup(own.render(props)),
            markup(up.render(props)),
            JSON.stringify({ version, ...props }),
          );
          checks++;
        }
}
console.log(checks + " breadcrumb SSR comparisons pass against both Material controls");
