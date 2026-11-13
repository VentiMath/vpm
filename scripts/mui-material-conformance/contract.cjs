"use strict";
const assert = require("node:assert/strict");
const { peer } = require("./paths.cjs"),
  React = peer("react"),
  { renderToStaticMarkup: render } = peer("react-dom/server"),
  own = require(require("./prepare.cjs"));
const h = React.createElement;
const variants = [];
for (const tag of ["ButtonBase", "Button", "IconButton", "Fab", "ToggleButton"])
  for (const props of [
    {},
    { disabled: true },
    { component: "a", href: "/contest" },
    { href: "/contest", disabled: true },
    { component: "div" },
    { component: "div", disabled: true },
    { type: "submit" },
    ...(tag === "ToggleButton" ? [{ value: "math", selected: true }] : []),
  ])
    variants.push({ tag, props });
function attributes(html) {
  const root = html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .match(/^<([\w-]+)([^>]*)>/);
  return {
    tag: root[1],
    attrs: Object.fromEntries(
      [...root[2].matchAll(/([\w-]+)="([^"]*)"/g)]
        .filter((x) => !["class", "style", "id"].includes(x[1]))
        .map((x) => [x[1], x[2]]),
    ),
  };
}
let count = 0;
for (const lib of ["@mui/material", "mui-material-app"]) {
  const upstream = peer(lib);
  for (const { tag, props } of variants) {
    const p = {
      disableRipple: true,
      ...(tag === "ToggleButton" ? { value: "a" } : {}),
      ...props,
    };
    const a = attributes(render(h(own[tag], p, "Contest"))),
      b = attributes(render(h(upstream[tag], p, "Contest")));
    assert.deepEqual(a, b, lib + " " + tag + " " + JSON.stringify(props));
    count++;
  }
}
console.log(
  count + " button root/disabled/link semantics match current and app Material",
);
