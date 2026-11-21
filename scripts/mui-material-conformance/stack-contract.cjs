"use strict";
const assert = require("node:assert/strict"),
  base = require("./stack-build.cjs");
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
  const own = require(base + "/" + version + "-vpm/stack-ssr.cjs");
  const control = require(base + "/" + version + "-upstream/stack-ssr.cjs");
  assert.deepEqual(own.classes, control.classes);
  for (const kind of ["arml", "warml", "mic", "editor"])
    for (const count of [0, 1, 4])
      for (const styled of [false, true])
        for (const divider of [false, true]) {
          const props = { kind, count, styled, divider };
          const a = markup(own.render(props)),
            b = markup(
              control.render({ ...props, modern: version === "current" }),
            );
          assert.equal(a, b, JSON.stringify({ version, ...props }));
          assert.equal(
            (a.match(/<hr/g) || []).length,
            divider ? Math.max(0, count - 1) : 0,
          );
          checks++;
        }
}
console.log(
  checks + " Stack SSR comparisons matched on both Material versions.",
);
