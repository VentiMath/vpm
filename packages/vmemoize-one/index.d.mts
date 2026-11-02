export type EqualityFn<F extends (...args: any[]) => any> = (next: Parameters<F>, previous: Parameters<F>) => boolean;
export type MemoizedFn<F extends (this: any, ...args: any[]) => any> = {
  (this: ThisParameterType<F>, ...args: Parameters<F>): ReturnType<F>;
  clear(): void;
};
export default function memoizeOne<F extends (this: any, ...args: any[]) => any>(fn: F, equal?: EqualityFn<F>): MemoizedFn<F>;
