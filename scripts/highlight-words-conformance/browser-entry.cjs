"use strict";
const React = require("react"),
  { createRoot } = require("react-dom/client"),
  { flushSync } = require("react-dom");
const { MRT_TableBodyCellValue: Cell } = require("fixture-caller"),
  props = require("./props.cjs");
module.exports = (variant) => {
  const host = document.createElement("div");
  host.id = variant;
  document.body.append(host);
  const root = createRoot(host);
  let current = {};
  const render = () =>
    flushSync(() => root.render(React.createElement(Cell, props(current))));
  window.highlightControls ??= {};
  window.highlightControls[variant] = {
    set(value) {
      current = value;
      render();
    },
    rerender: render,
  };
  render();
};
