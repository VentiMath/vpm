'use client';
'use strict';
const React = require('react');
// A body can outlive its document's current body. Each mounted effect owns a
// lease on the exact pair it acquired, so cleanup cannot remove another pair.
const bodies = new WeakMap();
function guard(document) {
  const node = document.createElement('span');
  node.setAttribute('data-radix-focus-guard', '');
  node.tabIndex = 0;
  Object.assign(node.style, {outline: 'none', opacity: '0', position: 'fixed', pointerEvents: 'none'});
  return node;
}
function useFocusGuards() {
  React.useEffect(() => {
    const body = document.body;
    let state = bodies.get(body);
    if (!state) {
      state = {start: guard(body.ownerDocument), end: guard(body.ownerDocument), count: 0};
      bodies.set(body, state);
    }
    if (body.firstElementChild !== state.start) body.prepend(state.start);
    if (body.lastElementChild !== state.end) body.append(state.end);
    state.count++;
    return () => {
      if (--state.count === 0) {
        state.start.remove();
        state.end.remove();
        bodies.delete(body);
      }
    };
  }, []);
}
function FocusGuards({children}) {
  useFocusGuards();
  return children;
}
exports.FocusGuards = FocusGuards;
exports.Root = FocusGuards;
exports.useFocusGuards = useFocusGuards;
