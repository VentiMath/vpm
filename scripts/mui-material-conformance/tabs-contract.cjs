"use strict";
const assert = require("node:assert/strict"),
  base = require("./tabs-build.cjs");
function markup(html, legacy = false) {
  // App Material 7 includes these retired class names. Owned ButtonBase emits
  // its existing inert SSR ripple host before the first interaction.
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<span class="MuiTouchRipple-root"[^>]*><\/span>/g, "")
    .replace(
      / class="([^"]*)"/g,
      (_, list) =>
        ' class="' +
        [
          ...new Set(
            list
              .split(" ")
              .filter(
                (name) =>
                  name &&
                  !name.startsWith("css-") &&
                  !(
                    legacy &&
                    ["MuiTab-iconWrapper", "MuiTabs-flexContainer", "MuiTabs-flexContainerVertical"].includes(
                      name,
                    )
                  ),
              ),
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
for (const version of ["current", "app"]) {
  const upstream = require(base + "/" + version + "-upstream/tabs-ssr.cjs"),
    own = require(base + "/" + version + "-vpm/tabs-ssr.cjs");
  for (const kind of ["imo", "family"])
    for (const orientation of ["horizontal", "vertical"])
      for (const variant of ["standard", "fullWidth"])
        for (const centered of [true, false])
          for (const disabled of [true, false])
            for (const initial of [undefined, false, kind === "imo" ? 2 : "kid-c"]) {
              const props = { kind, orientation, variant, centered, disabled, initial };
              const actual = markup(own.render(props)),
                reference = markup(upstream.render(props), version === "app");
              // Material 7 assigns the first tab a tab stop during SSR with no selection.
              // Material 9 defers its tab stop to the client. Both app callers select a value.
              if (version === "app" && initial === false)
                assert.match(reference, /<button aria-selected="false"[^>]+tabindex="0"/);
              const expected =
                version === "app" && initial === false
                  ? reference.replace(/(<button aria-selected="false"[^>]+tabindex=")0/, "$1-1")
                  : reference;
              assert.equal(actual, expected, JSON.stringify({ version, ...props }));
              checks++;
            }
}
console.log(checks + " SSR comparisons passed for IMO and learner tab lists");
