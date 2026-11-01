"use strict";
process.env.NODE_ENV = "production";
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs");
const fixture = path.resolve(
  __dirname,
  "../../../scripts/floating-react-conformance",
);
require(path.join(fixture, "prepare.cjs"));
const root = path.resolve(__dirname, "..");
const cases = ["popover", "tooltip", "menu"].map((kind) => ({
  name: "SSR interactions / " + kind,
  make: (directory) => {
    const a = require(directory),
      React = require(path.join(fixture, "node_modules/react")),
      { renderToString } = require(
        path.join(fixture, "node_modules/react-dom/server"),
      );
    function App() {
      const [open, setOpen] = React.useState(false),
        [activeIndex, onNavigate] = React.useState(null),
        f = a.useFloating({ open, onOpenChange: setOpen }),
        listRef = React.useRef([]),
        labels = React.useRef([]);
      const click = a.useClick(f.context, { enabled: kind !== "tooltip" }),
        hover = a.useHover(f.context, {
          enabled: kind === "tooltip",
          restMs: 500,
        }),
        focus = a.useFocus(f.context, { enabled: kind === "tooltip" }),
        dismiss = a.useDismiss(f.context),
        role = a.useRole(f.context, {
          role:
            kind === "menu"
              ? "menu"
              : kind === "tooltip"
                ? "tooltip"
                : "dialog",
        }),
        navigation = a.useListNavigation(f.context, {
          enabled: kind === "menu",
          listRef,
          activeIndex,
          onNavigate,
        }),
        typeahead = a.useTypeahead(f.context, {
          enabled: kind === "menu",
          listRef: labels,
          activeIndex,
          onMatch: onNavigate,
        });
      const props = a.useInteractions([
        click,
        hover,
        focus,
        dismiss,
        role,
        navigation,
        typeahead,
      ]);
      return React.createElement("button", props.getReferenceProps(), kind);
    }
    return () => renderToString(React.createElement(App));
  },
  validate: (result) => assert.ok(result.includes(kind)),
}));
cases.push({
  name: "mounted interaction props / composed click",
  make: (directory) => {
    const { JSDOM } = require(path.join(fixture, "node_modules/jsdom"));
    const env = new JSDOM('<!doctype html><div id="root"></div>');
    for (const key of ["window", "document", "HTMLElement", "Element", "Node"])
      globalThis[key] = env.window[key];
    const a = require(directory),
      React = require(path.join(fixture, "node_modules/react")),
      { createRoot } = require(
        path.join(fixture, "node_modules/react-dom/client"),
      ),
      { flushSync } = require(path.join(fixture, "node_modules/react-dom"));
    let getters,
      count = 0;
    const internal = () => count++,
      user = () => count++;
    function App() {
      getters = a.useInteractions([
        {
          reference: { onClick: internal },
          item: ({ active }) => ({ "aria-selected": active }),
        },
      ]);
      return null;
    }
    flushSync(() =>
      createRoot(document.getElementById("root")).render(
        React.createElement(App),
      ),
    );
    const props = { onClick: user, title: "Menu" };
    return () => {
      count = 0;
      getters.getReferenceProps(props).onClick({});
      return count;
    };
  },
  validate: (result) => assert.equal(result, 2),
});
const files = [
  "bench/compare.cjs",
  "../../scripts/floating-react-conformance/prepare.cjs",
  "../../scripts/floating-react-conformance/package-lock.json",
];
for (const name of [
  "vfloating-ui-react",
  "vfloating-ui-react-dom",
  "vfloating-ui-dom",
  "vfloating-ui-core",
  "vfloating-ui-utils",
  "vtabbable",
])
  for (const file of fs.readdirSync(path.resolve(root, "..", name)))
    if (/\.(?:mjs|cjs|js)$/.test(file) || file === "package.json")
      files.push("../" + name + "/" + file);
for (const name of [
  "@floating-ui/react",
  "@floating-ui/react-dom",
  "@floating-ui/dom",
  "@floating-ui/core",
  "@floating-ui/utils",
  "tabbable",
  "react",
  "react-dom",
  "scheduler",
  "jsdom",
])
  files.push("../../scripts/floating-react-conformance/node_modules/" + name);
require("../../../scripts/bench-process.cjs")
  .run({
    root,
    upstream: path.join(fixture, "node_modules/@floating-ui/react"),
    vpm: root,
    cases,
    files,
    validationOnly: process.argv.includes("--validate"),
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
