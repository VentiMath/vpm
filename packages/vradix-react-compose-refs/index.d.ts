import type {Ref, RefCallback} from 'react';
type PossibleRef<T> = Ref<T> | undefined;
/** Assign callback/object refs in order; React 19 cleanup releases each once. */
export declare function composeRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T>;
/** Keep the composed callback stable while the participating refs are stable. */
export declare function useComposedRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T>;
