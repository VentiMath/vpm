import type {useLayoutEffect} from 'react';

/** Inserts styles before layout effects; on the server, or without useInsertionEffect (React 16, 17), runs the function at once. */
export declare const useInsertionEffectAlwaysWithSyncFallback: <T>(create: () => T) => T | undefined;
/** useInsertionEffect, or useLayoutEffect on React versions without it. */
export declare const useInsertionEffectWithLayoutFallback: typeof useLayoutEffect;
