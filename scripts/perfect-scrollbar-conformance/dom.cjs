"use strict";
const { JSDOM } = require("./node_modules/jsdom");
const active = [];
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
  const globals = {
    window: win,
    document: win.document,
    Event: win.Event,
    CustomEvent: win.CustomEvent,
    Element: win.Element,
    HTMLElement: win.HTMLElement,
    getComputedStyle: win.getComputedStyle.bind(win),
  };
  const record = { previous: Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)])) };
  Object.assign(globalThis, globals);
  active.push(record);
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
      const index = active.indexOf(record);
      if (index === -1) return;
      // A newer fixture may still own the globals. Rewire its restoration so
      // closing windows out of order cannot reinstall a closed document.
      if (index + 1 < active.length) active[index + 1].previous = record.previous;
      else for (const [key, descriptor] of Object.entries(record.previous)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
      active.splice(index, 1);
      dom.window.close();
    },
  };
}
module.exports = { fixture };
