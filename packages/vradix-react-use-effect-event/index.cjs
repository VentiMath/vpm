'use client';
'use strict';
const React = require('react');
function uncommitted() {
  throw new Error('Cannot call an event handler while rendering.');
}
function useCommittedEvent(callback) {
  const ref = React.useRef(null);
  if (ref.current === null) {
    const event = {current: uncommitted, run: null};
    event.run = (...args) => event.current?.(...args);
    ref.current = event;
  }
  const event = ref.current;
  // Publish only committed targets. An abandoned render cannot change an
  // already mounted handler. React 19 guarantees insertion effects.
  React.useInsertionEffect(() => { event.current = callback; });
  return event.run;
}
// Native effect events own their render-phase checks and commit semantics.
exports.useEffectEvent = typeof React.useEffectEvent === 'function'
  ? React.useEffectEvent
  : useCommittedEvent;
