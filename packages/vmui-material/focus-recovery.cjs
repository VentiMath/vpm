"use strict";
// Removing a focused descendant can move focus to body without a focusin event.
// Share one mutation subscription per document while focus traps are open.
const documents = new WeakMap();
function observeRemovedFocus(node, recover) {
  const doc = node.ownerDocument;
  const Observer = doc.defaultView?.MutationObserver;
  if (!Observer || !doc.body) return () => {};
  let state = documents.get(doc);
  if (!state) {
    const entries = new Set();
    const observer = new Observer(records => {
      if (doc.activeElement !== doc.body || !records.some(r => r.removedNodes.length)) return;
      // The most recently activated trap gets first refusal. Its ownership and
      // opt-out checks decide whether to recover; a parent must not steal focus.
      for (const entry of [...entries].reverse()) {
        if (doc.activeElement !== doc.body) break;
        if (entry.node.isConnected) entry.recover();
      }
    });
    observer.observe(doc.body, {childList: true, subtree: true});
    state = {entries, observer};
    documents.set(doc, state);
  }
  const entry = {node, recover};
  state.entries.add(entry);
  return () => {
    state.entries.delete(entry);
    if (!state.entries.size) {
      state.observer.disconnect();
      documents.delete(doc);
    }
  };
}
module.exports = {observeRemovedFocus};
