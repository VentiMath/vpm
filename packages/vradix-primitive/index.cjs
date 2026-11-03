"use strict";
// The DOM flag is an import-time capability, matching browser/server entry usage.
const canUseDOM = typeof window !== "undefined" && !!window.document?.createElement;
function composeEventHandlers(first, second, {checkForDefaultPrevented = true} = {}) {
  const check = checkForDefaultPrevented !== false;
  return event => {
    first?.(event);
    if (check && event?.defaultPrevented) return;
    return second?.(event);
  };
}
function owner(node) {
  if (!canUseDOM) throw new Error("Cannot access document outside of the DOM");
  // Document itself owns its defaultView; ownerDocument is null on Documents.
  return node?.nodeType === 9 ? node : node?.ownerDocument ?? document;
}
function getOwnerDocument(node) { return owner(node); }
function getOwnerWindow(node) {
  if (!canUseDOM) throw new Error("Cannot access window outside of the DOM");
  return owner(node).defaultView ?? window;
}
function isFrame(node) { return node.tagName === "IFRAME"; }
function getActiveElement(node, activeDescendant = false) {
  let doc = owner(node), active;
  const visited = new Set();
  while (doc && !visited.has(doc)) {
    visited.add(doc);
    active = doc.activeElement;
    if (!active?.nodeName) return null;
    if (!isFrame(active)) break;
    // Cross-origin frames remain the focus target in this document.
    let child;
    try { child = active.contentDocument; } catch { break; }
    if (!child) break;
    doc = child;
  }
  if (activeDescendant) {
    const id = active.getAttribute("aria-activedescendant");
    if (id) return owner(active).getElementById(id) ?? active;
  }
  return active;
}
module.exports = {canUseDOM, composeEventHandlers, getOwnerDocument, getOwnerWindow, getActiveElement, isFrame};
