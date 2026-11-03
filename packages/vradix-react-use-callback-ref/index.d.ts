/** Stable callable which invokes the latest committed callback. */
export declare function useCallbackRef<T extends (...args: any[]) => any>(callback: T | undefined): T;
