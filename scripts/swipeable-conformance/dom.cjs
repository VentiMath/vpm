"use strict";
const { JSDOM } = require("jsdom");
module.exports = () => {
  const dom = new JSDOM("<!doctype html><body></body>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  for (const n of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "Event",
    "MouseEvent",
    "TouchEvent",
    "getComputedStyle",
  ])
    Object.defineProperty(globalThis, n, {
      value: dom.window[n],
      configurable: true,
      writable: true,
    });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return dom;
};
