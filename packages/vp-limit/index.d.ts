declare function pLimit(concurrency: number | pLimit.Options): pLimit.LimitFunction;
declare namespace pLimit {
  interface Options {
    readonly concurrency: number;
    readonly rejectOnClear?: boolean;
  }
  interface LimitFunction {
    <Arguments extends unknown[], Result>(fn: (...args: Arguments) => Result | PromiseLike<Result>, ...args: Arguments): Promise<Result>;
    readonly activeCount: number;
    readonly pendingCount: number;
    concurrency: number;
    /** Discards pending work; rejects it with AbortError when rejectOnClear is enabled. */
    clearQueue(): void;
    map<Input, Result>(iterable: Iterable<Input> | ArrayLike<Input>, mapper: (value: Input, index: number) => Result | PromiseLike<Result>): Promise<Result[]>;
  }
  function limitFunction<Arguments extends unknown[], Result>(fn: (...args: Arguments) => Result | PromiseLike<Result>, options: Options): ((...args: Arguments) => Promise<Result>) & Pick<LimitFunction, 'clearQueue'>;
}
export = pLimit;
