"use strict";
const assert = require("node:assert/strict"),
  React = require("react"),
  { renderToString } = require("react-dom/server"),
  own = require(require("./prepare.cjs"));
const snapshot = (api, themes) => {
  function Value() {
    const t = api.useTheme();
    return React.createElement(
      "pre",
      null,
      JSON.stringify(
        t === null
          ? null
          : Reflect.ownKeys(t).map((key) => [String(key), t[key]]),
      ),
    );
  }
  let node = React.createElement(Value);
  for (const theme of themes.toReversed())
    node = React.createElement(api.ThemeProvider, { theme }, node);
  return renderToString(node);
};
let count = 0;
for (const control of [
  require("@mui/private-theming"),
  require("mui-private-theming-app"),
]) {
  assert.equal(snapshot(own, []), snapshot(control, []));
  count++;
  for (let n = 0; n < 100; n++) {
    const a = {
      mode: n % 2 ? "dark" : "light",
      spacing: n,
      colors: { primary: "blue" },
      [Symbol.for("fixture")]: n,
    };
    const b = { colors: { secondary: "red" }, title: "Contest " + n };
    const cases = [
      [a],
      [a, b],
      [a, (outer) => ({ ...outer, spacing: outer.spacing + 1 })],
      [a, () => ({ only: true })],
      [Object.freeze(a), Object.freeze(b)],
      [a, b, { direction: "rtl" }],
    ];
    for (const themes of cases) {
      assert.equal(snapshot(own, themes), snapshot(control, themes));
      count++;
    }
  }
}
console.log(
  count +
    " root/nested/functional/frozen/symbol theme comparisons pass against current9.5 and app7.2",
);
