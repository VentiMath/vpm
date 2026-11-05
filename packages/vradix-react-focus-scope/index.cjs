'use client';
'use strict';
const React = require('react');
const { Primitive } = require('vradix-react-primitive');
const { useComposedRefs } = require('vradix-react-compose-refs');
const { tabbable, isFocusable, isTabbable, getTabIndex } = require('vtabbable');
const documents = new WeakMap();
const candidateOptions = { getShadowRoot: true, displayCheck: 'full-native' };
const ScopeParent = React.createContext(null);
function descendsFrom(identity, ancestor) {
  for (let parent = identity.parent; parent; parent = parent.parent) if (parent === ancestor) return true;
  return false;
}
const active = doc => {
  let node = doc.activeElement;
  while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement;
  return node;
};
function contains(root, target) {
  for (let node = target; node; node = node.assignedSlot || node.parentNode || node.host) {
    if (node === root) return true;
  }
  return false;
}
function inside(scope, target) {
  return contains(scope.node, target) || scope.options.current.branches?.some(node =>
    node.ownerDocument === scope.doc && contains(node, target));
}
function focus(node, select = true) {
  if (!node?.focus) return false;
  const before = active(node.ownerDocument);
  node.focus({ preventScroll: true });
  if (active(node.ownerDocument) !== node) return false;
  if (select && before !== node && node.tagName === 'INPUT' && typeof node.select === 'function') node.select();
  return true;
}
function candidates(scope) { return tabbable(scope.node, candidateOptions); }
function boundaries(scope) {
  if (scope.node.shadowRoot || scope.node.tagName === 'SLOT') {
    const all = candidates(scope); return [all[0], all.at(-1)];
  }
  const potential = [], walker = scope.doc.createTreeWalker(scope.node, 1);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const index = getTabIndex(node);
    // Complex sequential order belongs to Tabbable. For the ordinary zero-index
    // DOM order, only the two surviving edges need full eligibility checks.
    if (node.shadowRoot || node.tagName === 'SLOT' || index > 0) {
      const all = candidates(scope); return [all[0], all.at(-1)];
    }
    if (index === 0) potential.push(node);
  }
  let start = 0, end = potential.length - 1;
  while (start <= end && !isTabbable(potential[start], candidateOptions)) start++;
  while (end > start && !isTabbable(potential[end], candidateOptions)) end--;
  return [potential[start], potential[end]];
}
function recover(scope) {
  const last = scope.last;
  if (last?.isConnected && inside(scope, last) && isFocusable(last, candidateOptions) && focus(last)) return;
  for (const node of candidates(scope)) if (focus(node)) return;
  focus(scope.node, false);
}
function manager(doc) {
  let state = documents.get(doc);
  if (state) return state;
  state = { stack: [], epoch: 0, correcting: false };
  const current = () => state.stack.at(-1);
  const repair = scope => {
    if (state.correcting) return;
    state.correcting = true;
    try { recover(scope); } finally { state.correcting = false; }
  };
  const enter = event => {
    const scope = current();
    if (!scope) return;
    const target = event.composedPath()[0];
    if (inside(scope, target)) scope.last = target;
    else if (scope.options.current.trapped) repair(scope);
  };
  const leave = event => {
    const scope = current();
    // Moves within a shadow root can be retargeted away from document listeners.
    // The composed path on departure still identifies the actual focused node.
    const departing = event.composedPath()[0];
    if (scope && inside(scope, departing)) scope.last = departing;
    if (scope?.options.current.trapped && event.relatedTarget && !inside(scope, event.relatedTarget)) repair(scope);
  };
  // Only the active scope may recover focus after its focused node is removed.
  const observer = new doc.defaultView.MutationObserver(() => {
    const scope = current();
    if (scope?.options.current.trapped && scope.last && !scope.last.isConnected && active(doc) === doc.body) repair(scope);
  });
  doc.addEventListener('focusin', enter);
  doc.addEventListener('focusout', leave);
  observer.observe(doc, { childList: true, subtree: true });
  state.dispose = () => {
    doc.removeEventListener('focusin', enter); doc.removeEventListener('focusout', leave);
    observer.disconnect(); documents.delete(doc);
  };
  documents.set(doc, state);
  return state;
}
function autoFocus(scope, mounting) {
  const type = mounting ? 'focusScope.autoFocusOnMount' : 'focusScope.autoFocusOnUnmount';
  const event = new scope.doc.defaultView.CustomEvent(type, { cancelable: true });
  const handler = value => scope.options.current[mounting ? 'onMountAutoFocus' : 'onUnmountAutoFocus']?.(value);
  scope.node.addEventListener(type, handler);
  try { scope.node.dispatchEvent(event); } finally { scope.node.removeEventListener(type, handler); }
  return event.defaultPrevented;
}
const FocusScope = React.forwardRef(function FocusScope({ loop = false, trapped = false, branches,
  onMountAutoFocus, onUnmountAutoFocus, onKeyDown, ...attributes }, forwardedRef) {
  const [node, setNode] = React.useState(null);
  const parent = React.useContext(ScopeParent);
  const identity = React.useRef({ parent }).current;
  const options = React.useRef({ loop, trapped, branches, onMountAutoFocus, onUnmountAutoFocus });
  const owned = React.useRef(null), pending = React.useRef(null);
  React.useInsertionEffect(() => { identity.parent = parent; options.current = { loop, trapped, branches, onMountAutoFocus, onUnmountAutoFocus }; });
  const ref = useComposedRefs(forwardedRef, setNode);
  React.useEffect(() => {
    if (!node) return;
    const doc = node.ownerDocument;
    let returnTo = active(doc);
    const previous = pending.current;
    if (previous) {
      previous.doc.defaultView.clearTimeout(previous.timer); pending.current = null;
      if (previous.doc === doc) returnTo = previous.returnTo;
      if (previous.node !== node) autoFocus(previous, false);
    }
    const state = manager(doc);
    // Child effects can run before their parent's. Preserve logical React
    // nesting, including portalled children, rather than relying on effect order.
    const childIndex = state.stack.findIndex(entry => descendsFrom(entry.identity, identity));
    if (childIndex >= 0) returnTo = state.stack[childIndex].returnTo;
    const scope = { node, doc, options, identity, returnTo, last: null, timer: null };
    state.epoch++; state.stack.splice(childIndex < 0 ? state.stack.length : childIndex, 0, scope); owned.current = scope;
    if (inside(scope, active(doc))) scope.last = active(doc);
    else if (!autoFocus(scope, true) && state.stack.at(-1) === scope) {
      for (const candidate of candidates(scope)) {
        // Mount autofocus follows Radix's convention of excluding links.
        if (candidate.tagName !== 'A' && focus(candidate)) break;
      }
      if (!inside(scope, active(doc))) focus(node, false);
    }
    return () => {
      const wasTop = state.stack.at(-1) === scope;
      state.stack.splice(state.stack.indexOf(scope), 1); const epoch = ++state.epoch;
      if (owned.current === scope) owned.current = null;
      pending.current = scope;
      if (!state.stack.length) state.dispose();
      scope.timer = doc.defaultView.setTimeout(() => {
        if (pending.current !== scope) return;
        pending.current = null;
        const cancelled = autoFocus(scope, false);
        const current = active(doc), live = documents.get(doc);
        // Default restoration must not overrule a newer scope or a later focus
        // choice. A detached return target is never a useful destination.
        if (!cancelled && wasTop && state.epoch === epoch && (!live || live === state) &&
            (!current || current === doc.body || inside(scope, current))) {
          if (!scope.returnTo?.isConnected || !focus(scope.returnTo)) focus(doc.body, false);
        }
      }, 0);
    };
  }, [node]);
  const keyDown = event => {
    onKeyDown?.(event);
    const scope = owned.current, settings = options.current;
    if (event.defaultPrevented || !scope || documents.get(scope.doc)?.stack.at(-1) !== scope ||
        !settings.loop && !settings.trapped || event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    const [first, last] = boundaries(scope), focused = active(scope.doc);
    if (!first) { if (focused === scope.node) event.preventDefault(); return; }
    if (focused === (event.shiftKey ? first : last)) {
      event.preventDefault();
      if (settings.loop) focus(event.shiftKey ? last : first);
    }
  };
  return React.createElement(ScopeParent.Provider, { value: identity },
    React.createElement(Primitive.div, { tabIndex: -1, ...attributes, ref, onKeyDown: keyDown }));
});
FocusScope.displayName = 'FocusScope';

const Branches = React.createContext(null);
function FocusScopeBranchProvider({ registry, children }) {
  return registry ? React.createElement(Branches.Provider, { value: registry }, children) : children;
}
function useFocusScopeBranchRegistry() {
  const [nodes, setNodes] = React.useState([]);
  const registry = React.useMemo(() => {
    const owners = new Map();
    return {
      add(node) { const count = owners.get(node) || 0; owners.set(node, count + 1); if (!count) setNodes([...owners.keys()]); },
      remove(node) {
        const count = owners.get(node); if (!count) return;
        if (count > 1) owners.set(node, count - 1);
        else { owners.delete(node); setNodes([...owners.keys()]); }
      },
    };
  }, []);
  return { nodes, registry };
}
function useFocusScopeBranch(node) {
  const registry = React.useContext(Branches);
  React.useEffect(() => {
    if (!node || !registry) return;
    registry.add(node); return () => registry.remove(node);
  }, [node, registry]);
}
module.exports = { FocusScope, Root: FocusScope, FocusScopeBranchProvider, useFocusScopeBranchRegistry, useFocusScopeBranch };
