"use strict";
const assert = require("node:assert/strict"),
  base = require("./snackbar-build.cjs");
function markup(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
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
  const own = require(base + "/" + version + "-vpm/snackbar-ssr.cjs");
  const up = require(base + "/" + version + "-upstream/snackbar-ssr.cjs");
  assert.deepEqual(own.classes, up.classes);
  for (const props of [{message:"Copied", role:"status",square:true,elevation:1},{message:"Copied",action:0}]) {
    assert.equal(markup(own.renderContent(props)),markup(up.renderContent(props)));
    checks++;
  }
  for (const vertical of ["top", "bottom"]) for (const horizontal of ["left","center","right"])
    for (const open of [false,true]) for (const custom of [false,true]) for (const action of [false,true]) {
      const props = {open, custom, action, anchorOrigin:{vertical,horizontal},classes:{root:"custom-root"}};
      assert.equal(markup(own.render(props)), markup(up.render(props)), JSON.stringify({version,...props}));
      checks++;
    }
}
console.log(checks + " Snackbar SSR cases match Material 7 and 9");
