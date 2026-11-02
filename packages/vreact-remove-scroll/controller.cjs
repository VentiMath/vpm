"use strict";
const documents = new WeakMap();
const element = (value) =>
  value && ("current" in value ? value.current : value);
const parent = (node) => {
  const parentNode = node.parentNode;
  return parentNode?.host || parentNode;
};
function contains(boundary, node) {
  if (!boundary || !node) return false;
  if (boundary.contains(node)) return true;
  // Native containment covers ordinary DOM; only shadow hosts need bridging.
  for (let host = node.getRootNode?.().host; host; host = host.getRootNode().host)
    if (boundary.contains(host)) return true;
  return false;
}
function canMove(target, boundary, axis, delta) {
  let available = 0;
  const doc = target.ownerDocument;
  for (let node = target; node && node !== doc.body; node = parent(node)) {
    if (node.nodeType === 1) {
      const css = doc.defaultView.getComputedStyle(node);
      const overflow = axis === "x" ? css.overflowX : css.overflowY;
      if (
        overflow !== "hidden" &&
        overflow !== "clip" &&
        (overflow === "auto" ||
          overflow === "scroll" ||
          overflow === "overlay" ||
          node.tagName === "TEXTAREA")
      ) {
        const size =
          axis === "x"
            ? node.scrollWidth - node.clientWidth
            : node.scrollHeight - node.clientHeight;
        if (size > 0) {
          const rtl = axis === "x" && css.direction === "rtl";
          const position = Math.max(
            0,
            Math.min(
              size,
              axis === "y"
                ? node.scrollTop
                : rtl
                  ? -node.scrollLeft
                  : node.scrollLeft,
            ),
          );
          available += (rtl ? -delta : delta) > 0 ? size - position : position;
        }
      }
    }
    if (node === boundary) break;
  }
  return available >= 1;
}
function decision(lock, event) {
  const props = lock.props;
  // Only an open shadow host can expose a different target to this document.
  // Ordinary events do not need to allocate their entire propagation path.
  const target = event.target?.shadowRoot
    ? event.composedPath?.()[0] || event.target
    : event.target;
  if (!target?.ownerDocument) return false;
  let boundary = lock.ref.current;
  // React capture identifies the lock's own events, including portals. Events
  // not captured by the active lock can only enter through an explicit shard.
  if (!lock.captured.has(event)) {
    boundary = undefined;
    if (props.shards)
      for (const candidate of props.shards) {
        const node = element(candidate);
        if (node && contains(node, target)) {
          boundary = node;
          break;
        }
      }
    if (!boundary) return !props.noIsolation;
  }
  const touch = event.type === "touchmove";
  if ((touch && event.touches.length > 1) || (!touch && event.ctrlKey))
    return !props.allowPinchZoom;
  let x = event.deltaX,
    y = event.deltaY;
  if (touch) {
    const point = event.changedTouches[0];
    if (!point) return false;
    x = lock.touch[0] - point.clientX;
    y = lock.touch[1] - point.clientY;
    lock.touch = [point.clientX, point.clientY];
    if (Math.abs(x) > Math.abs(y) && target.type === "range") return false;
    const selection = target.ownerDocument.defaultView.getSelection();
    if (
      !selection?.isCollapsed &&
      selection?.anchorNode &&
      (contains(target, selection.anchorNode) ||
        contains(selection.anchorNode, target))
    )
      return false;
  }
  if (!x && !y) return false;
  let axis = Math.abs(x) > Math.abs(y) ? "x" : "y";
  if (touch) axis = lock.axis ||= axis;
  return !canMove(target, boundary, axis, axis === "x" ? x : y);
}
function register(lock) {
  const doc = lock.ref.current?.ownerDocument;
  if (!doc) return () => {};
  let state = documents.get(doc);
  if (!state) {
    state = { locks: [] };
    state.move = (event) => {
      const active = state.locks.at(-1);
      if (active && decision(active, event) && event.cancelable)
        event.preventDefault();
    };
    state.start = (event) => {
      const active = state.locks.at(-1),
        point = event.changedTouches[0];
      if (active && point) {
        active.touch = [point.clientX, point.clientY];
        active.axis = undefined;
      }
    };
    documents.set(doc, state);
    doc.addEventListener("wheel", state.move, { passive: false });
    doc.addEventListener("touchmove", state.move, { passive: false });
    doc.addEventListener("touchstart", state.start, { passive: false });
  }
  state.locks.push(lock);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    state.locks.splice(state.locks.indexOf(lock), 1);
    if (!state.locks.length) {
      doc.removeEventListener("wheel", state.move);
      doc.removeEventListener("touchmove", state.move);
      doc.removeEventListener("touchstart", state.start);
      documents.delete(doc);
    }
  };
}
module.exports = { register, element };
