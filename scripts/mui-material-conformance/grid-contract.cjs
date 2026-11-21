"use strict";
const assert = require("node:assert/strict"),
  base = require("./grid-build.cjs");
function markup(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(
      / class="([^"]*)"/g,
      (_, list) =>
        ' class="' +
        [
          ...new Set(
            list.split(" ").filter((name) => name && !name.startsWith("css-")),
          ),
        ]
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
for (const version of ["app", "current"]) {
  const up = require(base + "/" + version + "-upstream/grid-ssr.cjs"),
    own = require(base + "/" + version + "-vpm/grid-ssr.cjs");
  for (const [slot, cls] of Object.entries(up.classes))
    assert.equal(own.classes[slot], cls);
  for (const loading of [false, true])
    for (const styled of [false, true])
      for (const size of [
        { xs: 12, sm: 6, md: 4 },
        [12, null, 4],
        6,
        "auto",
        "grow",
      ])
        for (const layout of [
          { spacing: 2 },
          { spacing: { xs: 1, md: 3 }, wrap: "nowrap", offset: { sm: 1 } },
          { columns: 6, spacing: [1, 2], nested: "direct" },
          { columns: 6, spacing: 1, nested: "wrapped" },
        ]) {
          const props = { loading, styled, size, ...layout, count: 3 };
          assert.equal(
            markup(own.render(props)),
            markup(up.render(props)),
            JSON.stringify({ version, ...props }),
          );
          checks++;
        }
}
console.log(
  checks +
    " responsive Grid markup comparisons match the app and current Material controls.",
);
