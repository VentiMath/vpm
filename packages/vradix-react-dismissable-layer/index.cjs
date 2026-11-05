'use client';
'use strict';
const React = require('react');
const ReactDOM = require('react-dom');
const { Primitive } = require('vradix-react-primitive');
const { useComposedRefs } = require('vradix-react-compose-refs');

const documents = new WeakMap();
const ParentLayer = React.createContext(null);
const chainEvents = ['pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'];

function contains(node, event) {
  // composedPath includes nodes hidden by shadow-root retargeting.
  return event.composedPath().includes(node) || node.contains(event.target);
}
function registeredInside(registry, event) {
  for (const node of registry.keys()) if (contains(node, event)) return true;
  return false;
}
function cancelPending(record) {
  if (record.pending?.timer !== undefined) record.state.window.clearTimeout(record.pending.timer);
  record.pending = null;
}
function emit(record, originalEvent, pointer) {
  if (!record.live) return;
  const options = record.options.current;
  const event = new record.state.window.CustomEvent('dismissableLayer.' + (pointer ? 'pointerDownOutside' : 'focusOutside'), {
    cancelable: true, detail: { originalEvent },
  });
  const target = originalEvent.target;
  const callback = () => {
    (pointer ? options.onPointerDownOutside : options.onFocusOutside)?.(event);
    options.onInteractOutside?.(event);
  };
  const dispatch = () => {
    target.addEventListener(event.type, callback, { once: true });
    try { target.dispatchEvent(event); }
    finally { target.removeEventListener(event.type, callback); }
    if (!event.defaultPrevented && record.live) options.onDismiss?.();
  };
  if (pointer) ReactDOM.flushSync(dispatch);
  else dispatch();
}
function finish(record, pending) {
  if (!record.live || record.pending !== pending) return;
  cancelPending(record);
  if (!pending.intercepted.size) emit(record, pending.event, true);
}
function synchronize(state) {
  let cutoff = -1;
  for (let i = 0; i < state.layers.length; i++) if (state.layers[i].options.current.disableOutsidePointerEvents) cutoff = i;
  state.cutoff = cutoff;
  if (cutoff !== -1 && !state.lock && state.document.body) {
    const body = state.document.body, style = body.style;
    state.lock = { body, value: style.getPropertyValue('pointer-events'), priority: style.getPropertyPriority('pointer-events') };
    style.setProperty('pointer-events', 'none', state.lock.priority);
  } else if (cutoff === -1 && state.lock) {
    const { body, value, priority } = state.lock;
    // A later owner may have changed this property. Release only our own value.
    if (body.style.getPropertyValue('pointer-events') === 'none' && body.style.getPropertyPriority('pointer-events') === priority) {
      if (value) body.style.setProperty('pointer-events', value, priority);
      else body.style.removeProperty('pointer-events');
    }
    state.lock = null;
  }
  for (let i = 0; i < state.layers.length; i++) {
    const layer = state.layers[i], value = cutoff === -1 ? undefined : i >= cutoff ? 'auto' : 'none';
    if (value !== layer.pointerEvents) { layer.pointerEvents = value; layer.setPointerEvents(value); }
  }
}
function disposeIfEmpty(state) {
  if (state.layers.length || state.branches.size || state.surfaces.size) return;
  for (const [type, handler, capture] of state.listeners) state.document.removeEventListener(type, handler, capture);
  documents.delete(state.document);
}
function stateFor(document) {
  let state = documents.get(document);
  if (state) return state;
  state = { document, window: document.defaultView, layers: [], branches: new Map(), surfaces: new Map(), events: new WeakMap(), listeners: [], cutoff: -1, lock: null };
  documents.set(document, state);
  function listen(type, handler, capture = false) {
    document.addEventListener(type, handler, capture);
    state.listeners.push([type, handler, capture]);
  }
  function snapshot(event) { state.events.set(event, { layers: state.layers.slice(), inside: new Set() }); }
  listen('pointerdown', event => {
    for (const record of state.layers) cancelPending(record);
    snapshot(event);
  }, true);
  listen('pointerdown', event => {
    const frame = state.events.get(event);
    if (!frame || registeredInside(state.branches, event)) return;
    for (const record of frame.layers) {
      if (!record.live || !record.armed || frame.inside.has(record.identity) || contains(record.node, event)) continue;
      if (state.layers.indexOf(record) < state.cutoff) continue;
      if (record.options.current.deferPointerDownOutside && event.button === 0) {
        record.pending = { event, intercepted: new Set() };
      } else emit(record, event, true);
    }
  });
  listen('focusin', snapshot, true);
  listen('focusin', event => {
    const frame = state.events.get(event);
    if (!frame || registeredInside(state.branches, event)) return;
    for (const record of frame.layers) {
      if (record.live && !record.pending && !frame.inside.has(record.identity) && !contains(record.node, event)) emit(record, event, false);
    }
  });
  listen('keydown', event => {
    if (event.key !== 'Escape' || event.isComposing) return;
    const record = state.layers.at(-1);
    if (!record) return;
    const options = record.options.current;
    options.onEscapeKeyDown?.(event);
    if (!event.defaultPrevented && record.live && options.onDismiss) { event.preventDefault(); options.onDismiss(); }
  }, true);
  for (const type of chainEvents) {
    listen(type, event => {
      const surface = registeredInside(state.surfaces, event);
      for (const record of state.layers) {
        const pending = record.pending;
        if (!pending) continue;
        if (!surface) pending.intercepted.add(type);
        if (type === 'click') {
          if (pending.timer !== undefined) state.window.clearTimeout(pending.timer);
          pending.timer = state.window.setTimeout(() => finish(record, pending), 0);
        }
      }
    }, true);
    listen(type, () => {
      // Callbacks may unmount or add layers; visit only this dispatch's owners.
      for (const record of state.layers.slice()) {
        const pending = record.pending;
        if (!pending) continue;
        pending.intercepted.delete(type);
        if (type === 'click') finish(record, pending);
      }
    });
  }
  listen('pointercancel', event => {
    for (const record of state.layers) if (record.pending?.event.pointerId === event.pointerId) cancelPending(record);
  }, true);
  return state;
}
function isDescendant(identity, parent) {
  for (let current = identity.parent; current; current = current.parent) if (current === parent) return true;
  return false;
}
function registerLayer(node, identity, options, setPointerEvents) {
  const state = stateFor(node.ownerDocument);
  const record = { state, node, identity, options, setPointerEvents, live: true, armed: false, pending: null, pointerEvents: null };
  // Child effects can run first, including portals. Preserve logical nesting.
  const descendant = state.layers.findIndex(layer => isDescendant(layer.identity, identity));
  state.layers.splice(descendant === -1 ? state.layers.length : descendant, 0, record);
  const timer = state.window.setTimeout(() => { record.armed = true; }, 0);
  synchronize(state);
  return recordWithCleanup(record, timer);
}
function recordWithCleanup(record, timer) {
  record.release = () => {
    if (!record.live) return;
    record.live = false;
    record.state.window.clearTimeout(timer);
    cancelPending(record);
    record.state.layers.splice(record.state.layers.indexOf(record), 1);
    synchronize(record.state);
    disposeIfEmpty(record.state);
  };
  return record;
}
const DismissableLayer = React.forwardRef(function DismissableLayer({
  disableOutsidePointerEvents = false, deferPointerDownOutside = false,
  onEscapeKeyDown, onPointerDownOutside, onFocusOutside, onInteractOutside, onDismiss,
  onPointerDownCapture, onFocusCapture, style, ...props
}, forwardedRef) {
  const parent = React.useContext(ParentLayer);
  const identity = React.useMemo(() => ({ parent }), [parent]);
  const [node, setNode] = React.useState(null);
  const [pointerEvents, setPointerEvents] = React.useState();
  const ref = useComposedRefs(forwardedRef, setNode);
  const options = React.useRef({}), record = React.useRef(null);
  React.useInsertionEffect(() => {
    options.current = { disableOutsidePointerEvents, deferPointerDownOutside, onEscapeKeyDown, onPointerDownOutside, onFocusOutside, onInteractOutside, onDismiss };
  });
  React.useEffect(() => {
    if (!node) return;
    const registered = registerLayer(node, identity, options, setPointerEvents);
    record.current = registered;
    return () => { registered.release(); record.current = null; };
  }, [node, identity]);
  React.useEffect(() => {
    if (record.current) { cancelPending(record.current); synchronize(record.current.state); }
  }, [disableOutsidePointerEvents, deferPointerDownOutside]);
  function mark(event) {
    const native = event.nativeEvent, state = documents.get(event.currentTarget.ownerDocument);
    state?.events.get(native)?.inside.add(identity);
  }
  return React.createElement(ParentLayer.Provider, { value: identity }, React.createElement(Primitive.div, {
    ...props, ref, style: { pointerEvents, ...style },
    onPointerDownCapture(event) { mark(event); onPointerDownCapture?.(event); },
    onFocusCapture(event) { mark(event); onFocusCapture?.(event); },
  }));
});
DismissableLayer.displayName = 'DismissableLayer';

function useRegistry(kind) {
  const [node, setNode] = React.useState(null);
  React.useEffect(() => {
    if (!node) return;
    const state = stateFor(node.ownerDocument), registry = state[kind];
    registry.set(node, (registry.get(node) || 0) + 1);
    return () => {
      const remaining = registry.get(node) - 1;
      if (remaining) registry.set(node, remaining); else registry.delete(node);
      disposeIfEmpty(state);
    };
  }, [node, kind]);
  return setNode;
}
const DismissableLayerBranch = React.forwardRef(function DismissableLayerBranch(props, forwardedRef) {
  const ref = useComposedRefs(forwardedRef, useRegistry('branches'));
  return React.createElement(Primitive.div, { ...props, ref });
});
DismissableLayerBranch.displayName = 'DismissableLayerBranch';
function useDismissableLayerSurface() { return useRegistry('surfaces'); }
module.exports = { DismissableLayer, Root: DismissableLayer, DismissableLayerBranch, Branch: DismissableLayerBranch, useDismissableLayerSurface };
