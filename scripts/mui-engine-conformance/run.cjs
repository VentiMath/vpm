"use strict";
process.env.NODE_ENV = "production";
const assert = require("node:assert/strict"),
  React = require("react"),
  { renderToString } = require("react-dom/server"),
  own = require(require("./prepare.cjs"));
let comparisons = 0;
for (const name of ["@mui/styled-engine", "mui-styled-engine-app"]) {
  const control = require(name);
  for (let i = 0; i < 512; i++) {
    const style = {
      color: ["red", "#abcdef", "rebeccapurple"][i % 3],
      padding: i % 16,
      opacity: (i % 10) / 10,
      "&:hover": { marginLeft: i % 8 },
      "@media(min-width:800px)": { display: "flex" },
    };
    assert.deepEqual(
      own.internal_serializeStyles(style),
      control.internal_serializeStyles(style),
    );
    comparisons++;
    const render = (api) => {
      const C = api.default("section", {
        shouldForwardProp: (p) => p !== "tone",
      })(style, (p) => ({ borderColor: p.tone }));
      return renderToString(
        React.createElement(C, { tone: "blue", "data-n": i }, "Contest"),
      );
    };
    assert.equal(render(own), render(control));
    comparisons++;
  }
  for (const theme of [{}, { color: "blue" }])
    for (const fallback of [{ color: "red" }, { color: "green" }]) {
      const render = (api) =>
        renderToString(
          React.createElement(
            api.ThemeContext.Provider,
            { value: theme },
            React.createElement(api.GlobalStyles, {
              defaultTheme: fallback,
              styles: (t) => ({ body: { color: t.color } }),
            }),
          ),
        );
      assert.equal(render(own), render(control));
      comparisons++;
    }
  const render = (api) => {
    const A = api.default("div")({ color: "red" }, { padding: 2 });
    api.internal_mutateStyles(A, (s) => s.filter((x) => !x.padding));
    const B = api.default(A)({ margin: 3 });
    return renderToString(React.createElement(B));
  };
  assert.equal(render(own), render(control));
  comparisons++;
  assert.deepEqual(
    {
      ...own.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } }),
      toString: null,
    },
    {
      ...control.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } }),
      toString: null,
    },
  );
  comparisons++;
}
console.log(
  comparisons +
    " styling, serialized CSS, global fallback, inheritance and keyframe comparisons match",
);
