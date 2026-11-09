"use strict";
function globals() {
  global.Element = class {};
  global.HTMLElement = class extends Element {};
  global.SVGElement = class extends Element {};
  global.getComputedStyle = (e) => ({
    ...e.computed,
    getPropertyValue: (k) => e.computed[k] || "",
  });
  global.window = { getComputedStyle };
}
function node(svg = false) {
  return Object.assign(new (svg ? SVGElement : HTMLElement)(), {
    nodeType: 1,
    tagName: svg ? "svg" : "DIV",
    ...(svg ? { ownerSVGElement: null } : {}),
    namespaceURI: svg
      ? "http://www.w3.org/2000/svg"
      : "http://www.w3.org/1999/xhtml",
    style: {
      setProperty(k, v) {
        this[k] = String(v);
      },
    },
    computed: { opacity: ".2", transform: "none" },
    setAttribute(k, v) {
      this[k] = v;
    },
    ownerDocument: { defaultView: window },
  });
}
function renderer(element) {
  const values = new Map(),
    offs = new Map();
  return {
    current: element,
    values,
    getProps: () => ({}),
    getValue: (k) => values.get(k),
    addValue(k, v) {
      offs.get(k)?.();
      values.set(k, v);
      offs.set(
        k,
        v.on("change", () => {}),
      );
    },
    removeValue(k) {
      offs.get(k)?.();
      offs.delete(k);
      values.delete(k);
    },
    destroy() {
      for (const k of values.keys()) this.removeValue(k);
    },
  };
}
module.exports = { globals, node, renderer };
