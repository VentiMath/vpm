"use strict";
const { JSDOM } = require("./node_modules/jsdom");
function fixture() {
  const dom = new JSDOM(
    '<!doctype html><div id="box" style="position:relative;width:200px;height:100px"><div>Content</div></div>',
    { pretendToBeVisual: true },
  );
  const win = dom.window,
    element = win.document.querySelector("#box"),
    dimensions = {
      width: 200,
      height: 100,
      contentWidth: 600,
      contentHeight: 500,
    };
  let top = 0,
    left = 0;
  Object.assign(globalThis, {
    window: win,
    document: win.document,
    Event: win.Event,
    CustomEvent: win.CustomEvent,
    Element: win.Element,
    HTMLElement: win.HTMLElement,
    getComputedStyle: win.getComputedStyle.bind(win),
  });
  Object.defineProperties(element, {
    clientWidth: { get: () => dimensions.width },
    clientHeight: { get: () => dimensions.height },
    scrollWidth: { get: () => dimensions.contentWidth },
    scrollHeight: { get: () => dimensions.contentHeight },
    scrollTop: {
      get: () => top,
      set: (v) => {
        top = Math.max(
          0,
          Math.min(v, dimensions.contentHeight - dimensions.height),
        );
      },
    },
    scrollLeft: {
      get: () => left,
      set: (v) => {
        left = Math.max(
          0,
          Math.min(v, dimensions.contentWidth - dimensions.width),
        );
      },
    },
  });
  element.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: dimensions.width,
    bottom: dimensions.height,
    width: dimensions.width,
    height: dimensions.height,
  });
  return {
    dom,
    win,
    element,
    dimensions,
    close() {
      dom.window.close();
    },
  };
}
module.exports = { fixture };
