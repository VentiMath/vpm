"use strict";
const React = require("react"),
  UI = require("./ui.cjs").RemoveScroll,
  Sidecar = require("./sidecar.cjs");
const RemoveScroll = React.forwardRef((props, ref) =>
  React.createElement(UI, { ...props, ref, sideCar: Sidecar }),
);
RemoveScroll.classNames = UI.classNames;
exports.RemoveScroll = RemoveScroll;
