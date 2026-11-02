declare function memoizeOne<F extends (this: any, ...args: any[]) => any>(fn: F, equal?: memoizeOne.EqualityFn<F>): memoizeOne.MemoizedFn<F>;
declare namespace memoizeOne {
  type EqualityFn<F extends (...args: any[]) => any> = (next: Parameters<F>, previous: Parameters<F>) => boolean;
  type MemoizedFn<F extends (this: any, ...args: any[]) => any> = {
    (this: ThisParameterType<F>, ...args: Parameters<F>): ReturnType<F>;
    clear(): void;
  };
}
export = memoizeOne;
