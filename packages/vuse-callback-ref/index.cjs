'use strict';
const React = require('react');
const layoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;
const callbackCache = new WeakMap();
const emptyCallback = () => {};

function assignRef(ref, value) {
  if (typeof ref === 'function') ref(value);
  else if (ref != null) ref.current = value;
  return ref;
}

function observableRef(initial, notify) {
  let current = initial;
  return {
    get current() { return current; },
    set current(next) {
      const previous = current;
      if (next === previous) return;
      current = next;
      notify(next, previous);
    }
  };
}

function createCallbackRef(callback) {
  return observableRef(null, callback);
}

function useCallbackRef(initialValue, callback) {
  const cell = React.useRef(null);
  if (cell.current === null) {
    const state = {callback, ref: null};
    state.ref = observableRef(initialValue, (next, previous) => state.callback(next, previous));
    cell.current = state;
  }
  cell.current.callback = callback;
  return cell.current.ref;
}

// A throwing callback must not prevent the remaining refs from being cleared.
function broadcast(refs, value) {
  let failed = false, failure;
  for (const ref of refs) {
    try { assignRef(ref, value); }
    catch (error) { if (!failed) { failed = true; failure = error; } }
  }
  if (failed) throw failure;
}

function mergeRefs(refs) {
  return observableRef(null, value => broadcast(refs, value));
}

function useMergeRefs(refs, defaultValue) {
  // Own the membership snapshot: callers may reuse and mutate the input array.
  const incoming = refs.slice();
  const merged = useCallbackRef(defaultValue ?? null, value => broadcast(incoming, value));
  const previous = React.useRef(null);
  layoutEffect(() => {
    const old = previous.current;
    previous.current = incoming;
    if (old === null || old.length === incoming.length && old.every((ref, i) => ref === incoming[i])) return;
    const before = new Set(old), after = new Set(incoming);
    let failed = false, failure;
    const update = (refs, value) => {
      try { broadcast(refs, value); }
      catch (error) { if (!failed) { failed = true; failure = error; } }
    };
    update([...before].filter(ref => !after.has(ref)), null);
    update([...after].filter(ref => !before.has(ref)), merged.current);
    if (failed) throw failure;
  });
  return merged;
}

function transformRef(ref, transform) {
  return observableRef(null, value => assignRef(ref, transform(value)));
}

function useTransformRef(ref, transform) {
  return useCallbackRef(null, value => assignRef(ref, transform(value)));
}

function refToCallback(ref) {
  return value => { assignRef(ref, value); };
}

function useRefToCallback(ref) {
  if (ref == null) return emptyCallback;
  let callback = callbackCache.get(ref);
  if (!callback) { callback = refToCallback(ref); callbackCache.set(ref, callback); }
  return callback;
}

module.exports = {assignRef, createCallbackRef, useCallbackRef, mergeRefs, useMergeRefs,
  transformRef, useTransformRef, refToCallback, useRefToCallback};
