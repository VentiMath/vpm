'use client';
'use strict';
const React = require('react');
const nothing = () => {};
const subscribe = () => nothing;
const client = () => true;
const server = () => false;
// React selects the server snapshot for each hydrating root, even after a
// different root has mounted. There is no process-wide hydration state.
function useIsHydrated() {
  return React.useSyncExternalStore(subscribe, client, server);
}
module.exports = { useIsHydrated };
