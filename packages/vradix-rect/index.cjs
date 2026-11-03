'use strict';
const elements = new Map();
let frame = null;
let measuring = false;

function schedule() {
  if (elements.size && frame === null && !measuring) frame = requestAnimationFrame(tick);
}
function tick() {
  frame = null;
  measuring = true;
  const deliveries = [];
  let failed = false, failure;
  const remember = error => { if (!failed) { failed = true; failure = error; } };
  try {
    // Read every rectangle before invoking callbacks that might change layout.
    for (const [element, state] of elements) {
      try {
        const rect = element.getBoundingClientRect();
        const { width, height, top, right, bottom, left } = rect;
        if (!state.ready || width !== state.width || height !== state.height ||
            top !== state.top || right !== state.right || bottom !== state.bottom || left !== state.left) {
          state.ready = true;
          state.width = width; state.height = height;
          state.top = top; state.right = right; state.bottom = bottom; state.left = left;
          deliveries.push(rect, state.listeners.length === 1 ? state.listeners[0] : state.listeners.slice());
        }
      } catch (error) { remember(error); }
    }
    for (let i = 0; i < deliveries.length; i += 2) {
      const rect = deliveries[i], listeners = deliveries[i + 1];
      if (Array.isArray(listeners)) {
        for (const listener of listeners) if (listener.active) {
          try { listener.callback(rect); } catch (error) { remember(error); }
        }
      } else if (listeners.active) {
        try { listeners.callback(rect); } catch (error) { remember(error); }
      }
    }
  } finally {
    measuring = false;
    schedule();
  }
  // Preserve normal RAF error reporting without stranding other observers.
  if (failed) throw failure;
}

function observeElementRect(element, callback) {
  let state = elements.get(element);
  const existing = !!state;
  if (!state) {
    state = { ready: false, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, listeners: [] };
    elements.set(element, state);
  }
  const listener = { callback, active: true };
  state.listeners.push(listener);
  function unsubscribe() {
    if (!listener.active) return;
    listener.active = false;
    state.listeners.splice(state.listeners.indexOf(listener), 1);
    if (!state.listeners.length) elements.delete(element);
    if (!elements.size && frame !== null) { cancelAnimationFrame(frame); frame = null; }
  }
  try {
    schedule();
    // Radix gives additional subscribers an immediate current measurement.
    if (existing) callback(element.getBoundingClientRect());
  } catch (error) { unsubscribe(); throw error; }
  return unsubscribe;
}
exports.observeElementRect = observeElementRect;
