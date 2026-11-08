"use strict";
const load = require("./load.cjs");
class Host {
  constructor() {
    this.listeners = new Map();
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) {
    this.listeners.get(type)?.delete(fn);
  }
  dispatch(type, event) {
    for (const fn of this.listeners.get(type) || []) fn(event);
  }
}
module.exports = (file, options) => {
  const refs = [],
    memo = [];
  let index = 0,
    effects = [];
  const react = {
    useRef(initial) {
      const i = index++;
      return refs[i] || (refs[i] = { current: initial });
    },
    useMemo(fn, deps) {
      const i = index++;
      if (!memo[i] || deps.some((d, j) => d !== memo[i].deps[j]))
        memo[i] = { deps, result: fn() };
      return memo[i].result;
    },
    useEffect(fn) {
      index++;
      effects.push(fn);
    },
    useLayoutEffect(fn) {
      index++;
      effects.push(fn);
    },
  };
  const api = load(file, react),
    node = new Host(),
    doc = new Host();
  doc.defaultView = new Host();
  node.ownerDocument = doc;
  globalThis.document = doc;
  let handlers;
  function render(next) {
    index = 0;
    effects = [];
    handlers = api.useSwipeable(next);
    for (const fn of effects) fn();
    return handlers;
  }
  render(options);
  handlers.ref(node);
  return { node, doc, render, handlers };
};
