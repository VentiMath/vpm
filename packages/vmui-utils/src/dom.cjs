"use strict";
function ownerDocument(node) {
  const doc =
    node?.ownerDocument ??
    (node?.nodeType === 9 ? node : null) ??
    globalThis.document;
  if (!doc) throw Error("A document is required");
  return doc;
}
const ownerWindow = (node) =>
  ownerDocument(node).defaultView ?? globalThis.window;
function contains(parent, child) {
  if (!parent || !child) return false;
  for (let node = child; node; node = node.getRootNode?.()?.host ?? null)
    if (parent.contains(node)) return true;
  return false;
}
function getActiveElement(doc) {
  let active = doc.activeElement;
  while (active?.shadowRoot?.activeElement)
    active = active.shadowRoot.activeElement;
  return active;
}
const getEventTarget = (event) =>
  event.composedPath?.()[0] ?? event.target ?? null;
const getScrollbarSize = (win = globalThis.window) =>
  win.innerWidth - win.document.documentElement.clientWidth;
const isFocusVisible = (element) => {
  try {
    return element.matches(":focus-visible");
  } catch {
    return false;
  }
};
function createChainedFunction(...fns) {
  return function (...args) {
    for (const fn of fns)
      if (fn != null) {
        if (typeof fn !== "function") throw TypeError("Expected a callback");
        fn.apply(this, args);
      }
  };
}
function debounce(fn, wait = 166) {
  let handle;
  function debounced(...args) {
    clearTimeout(handle);
    const self = this;
    handle = setTimeout(() => {
      handle = undefined;
      fn.apply(self, args);
    }, wait);
  }
  debounced.clear = () => {
    clearTimeout(handle);
    handle = undefined;
  };
  return debounced;
}
function setRef(ref, value) {
  if (typeof ref === "function") return ref(value);
  if (ref) ref.current = value;
}
class Timeout {
  constructor() {
    this.currentId = null;
    this.clear = () => {
      if (this.currentId !== null) {
        clearTimeout(this.currentId);
        this.currentId = null;
      }
    };
    this.disposeEffect = () => this.clear;
  }
  static create() {
    return new Timeout();
  }
  start(delay, fn) {
    this.clear();
    this.currentId = setTimeout(() => {
      this.currentId = null;
      fn();
    }, delay);
  }
}
module.exports = {
  ownerDocument,
  ownerWindow,
  contains,
  getActiveElement,
  getEventTarget,
  getScrollbarSize,
  isFocusVisible,
  createChainedFunction,
  debounce,
  setRef,
  Timeout,
};
