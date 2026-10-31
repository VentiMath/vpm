/**
 * Node platform types, declared structurally so consumers need no ambient Node
 * types. Where Node (or DOM) types are loaded, these are the platform's own.
 */
export type Buffer = typeof globalThis extends {Buffer: {alloc(size: number): infer B}} ? B : Uint8Array;
export type AbortSignal = typeof globalThis extends {AbortSignal: {prototype: infer S}} ? S : {
    readonly aborted: boolean;
    readonly reason: unknown;
    throwIfAborted(): void;
    addEventListener(type: 'abort', listener: () => void, options?: {once?: boolean}): void;
    removeEventListener(type: 'abort', listener: () => void): void;
};
/** The members of Node's AsyncLocalStorage that callers use. */
export interface AsyncLocalStorage<T> {
    getStore(): T | undefined;
    run<R, A extends unknown[]>(store: T, callback: (...args: A) => R, ...args: A): R;
    exit<R, A extends unknown[]>(callback: (...args: A) => R, ...args: A): R;
    enterWith(store: T): void;
    disable(): void;
}
