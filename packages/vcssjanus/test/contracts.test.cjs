"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { transform: t } = require(process.env.VPM_CSSJANUS_ENTRY || "..");
test("opaque selectors, strings, URLs, custom properties and escaped identifiers", () => {
  const s =
    '.left:dir(rtl)[data-x="a;b{c}"]{--left:right;content:"left\\\" right; }";background:url("data:image/svg+xml,left;right{}");margin-left:1px}';
  assert.equal(t(s), s.replace("margin-left", "margin-right"));
  assert.equal(
    t(".x{float:ri\\ght;content:unright;--foo:left}"),
    ".x{float:ri\\ght;content:unright;--foo:left}",
  );
});
test("scoped noflip, comments and nesting", () => {
  const s =
    "/* @noflip */@media(x){.a{left:1px}.b{right:2px}}.c{/*! @noflip */left:3px;right:4px}";
  assert.equal(t(s), s.replace("right:4px", "left:4px"));
  assert.equal(
    t(".x{padding:1px /*two*/ 2px 3px 4px}"),
    ".x{padding:1px /*two*/ 4px 3px 2px}",
  );
  assert.equal(
    t(".x{padding:calc(1px + 2px) 2px 3px var(--left)}"),
    ".x{padding:calc(1px + 2px) var(--left) 3px 2px}",
  );
});
test("each background layer position changes, functions and image sizing stay intact", () => {
  assert.equal(
    t(".x{background:url(a) 10% 20%/30% 40%,url(b) 25% 35%/45% 55%}"),
    ".x{background:url(a) 90% 20%/30% 40%,url(b) 75% 35%/45% 55%}",
  );
  assert.equal(
    t(".x{background:linear-gradient(to right,red 20%,blue 40%) 10% 20%}"),
    ".x{background:linear-gradient(to left,red 20%,blue 40%) 90% 20%}",
  );
  assert.equal(
    t(".x{background-position:10px 30%,20% 40%}"),
    ".x{background-position:10px 30%,80% 40%}",
  );
});
test("multiple shadows and modern translations preserve all other axes", () => {
  assert.equal(
    t(
      ".x{box-shadow:1px 2px rgb(1,2,3),inset -3px 4px 5px red;transform:translate3d(10px,20px,30px)}",
    ),
    ".x{box-shadow:-1px 2px rgb(1,2,3),inset 3px 4px 5px red;transform:translate3d(-10px,20px,30px)}",
  );
});
test("URL switches work independently and cannot change selectors or quoted prose", () => {
  const s = '.left{content:"url(left-ltr)";background:url("left-ltr.svg")}';
  assert.equal(
    t(s, { transformDirInUrl: true }),
    s.replace("left-ltr.svg", "left-rtl.svg"),
  );
  assert.equal(
    t(s, { transformEdgeInUrl: true }),
    s.replace("left-ltr.svg", "right-ltr.svg"),
  );
});
test("uppercase and precise decimal percentages", () => {
  assert.equal(
    t(".x{MARGIN-LEFT:1px;FLOAT:LEFT}"),
    ".x{MARGIN-RIGHT:1px;FLOAT:RIGHT}",
  );
  const long = "0." + "0".repeat(120) + "1%";
  const complement = "99." + "9".repeat(121) + "%";
  assert.equal(
    t("background-position:" + long),
    "background-position:" + complement,
  );
  assert.equal(
    t("background-position:" + complement),
    "background-position:" + long,
  );
  for (const p of ["-10.50%", "110.125%", "2.3210%"])
    assert.equal(t(t("background-position:" + p)), "background-position:" + p);
});
test("malformed and absent inputs do not hang or leak state", () => {
  assert.throws(() => t(null), TypeError);
  for (const s of [
    "",
    "/**",
    'x{content:"left',
    'x{background:url("left',
    "x{left:1px;/* @noflip */",
  ])
    assert.equal(typeof t(s), "string");
  assert.equal(t("left:1px"), "right:1px");
});
