const React = require("react"),
  { createRoot } = require("react-dom/client");
const Autowhatever = require("react-autosuggest/dist/Autowhatever").default;
module.exports = function setup(variant) {
  const host = document.createElement("section");
  host.id = variant;
  document.body.append(host);
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
  ];
  window.themeControls ??= {};
  function Harness() {
    const [mode, setMode] = React.useState(0),
      [highlight, setHighlight] = React.useState(null),
      [revision, setRevision] = React.useState(0);
    const theme = React.useMemo(
      () =>
        mode === 0
          ? Object.fromEntries(keys.map((k) => [k, "fixture-" + k]))
          : mode === 1
            ? Object.fromEntries(
                keys.map((k, i) => [
                  k,
                  { color: i % 2 ? "blue" : "red", fontWeight: 400 + i },
                ]),
              )
            : [
                Object.fromEntries(
                  keys.map((k) => [k, { className: "decorated-" + k }]),
                ),
                (...parts) => parts.map((x) => x.className).join(" "),
              ],
      [mode],
    );
    window.themeControls[variant] = {
      setMode,
      highlight: setHighlight,
      rerender() {
        setRevision(revision + 1);
      },
    };
    return React.createElement(Autowhatever, {
      id: "same",
      items: ["alpha", "beta"],
      theme,
      highlightedItemIndex: highlight,
      renderItem: (item) => React.createElement("span", null, item),
      inputProps: { id: "input-" + variant, value: "", onChange() {} },
    });
  }
  createRoot(host).render(React.createElement(Harness));
};
