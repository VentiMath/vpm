"use strict";
const path = require("node:path"),
  assert = require("node:assert/strict"),
  React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server"),
  load = require("./load.cjs");
const a = load(require.resolve("react-themeable")),
  b = load(
    process.env.VPM_THEMEABLE_ENTRY ||
      path.resolve(__dirname, "../../packages/vreact-themeable"),
  );
const keys = [
  "container",
  "containerOpen",
  "input",
  "inputOpen",
  "inputFocused",
  "itemsContainer",
  "itemsContainerOpen",
  "itemsList",
  "item",
  "itemFirst",
  "itemHighlighted",
  "sectionContainer",
  "sectionContainerFirst",
  "sectionTitle",
];
const classes = Object.fromEntries(keys.map((k) => [k, "test-" + k]));
const styles = Object.fromEntries(
  keys.map((k, i) => [
    k,
    { color: i % 2 ? "blue" : "red", fontWeight: 400 + i },
  ]),
);
const themes = [
  a.defaultProps.theme,
  classes,
  styles,
  [styles, (...s) => s.map((x) => x.color).join(" ")],
];
let snapshots = 0;
for (const theme of themes)
  for (const [items, multiSection] of [
    [[], false],
    [["a", "b"], false],
    [[{ items: [] }, { items: ["a", "b"] }], true],
  ])
    for (const highlighted of [false, true]) {
      const props = {
        ...a.defaultProps,
        id: "caller",
        theme,
        items,
        multiSection,
        getSectionItems: (s) => s.items,
        renderItem: (item) => React.createElement("span", null, item),
        renderSectionTitle: () => null,
        highlightedSectionIndex: highlighted && multiSection ? 1 : null,
        highlightedItemIndex: highlighted && items.length ? 0 : null,
        inputProps: { value: "query", onChange() {} },
      };
      const first = new a(props).render(),
        second = new b(props).render();
      assert.equal(second.key, first.key);
      assert.deepEqual(second.props.className, first.props.className);
      assert.deepEqual(second.props.style, first.props.style);
      assert.equal(
        renderToStaticMarkup(React.createElement(b, props)),
        renderToStaticMarkup(React.createElement(a, props)),
      );
      snapshots++;
    }
console.log(
  `${snapshots} unchanged autosuggest class/style/decorated/empty/grouped render snapshots and root keys match.`,
);
