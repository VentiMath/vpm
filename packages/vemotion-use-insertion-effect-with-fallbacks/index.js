import * as React from 'react';
import isBrowser from '#is-browser';

// useInsertionEffect (React 18+) with fallbacks for React 16 and 17 and for
// server rendering. Read through a computed name so that bundlers do not
// report a missing export on React versions without it.
const useInsertionEffect = React['useInsertion' + 'Effect'] || false;
const runSynchronously = create => create();

/** Inserts styles before layout effects; on the server, or without useInsertionEffect, runs at once. */
export const useInsertionEffectAlwaysWithSyncFallback = isBrowser ? useInsertionEffect || runSynchronously : runSynchronously;

/** useInsertionEffect, or useLayoutEffect on React versions without it. */
export const useInsertionEffectWithLayoutFallback = useInsertionEffect || React.useLayoutEffect;
