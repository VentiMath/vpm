declare namespace gensync {
  type Handler<T> = Generator<unknown, T, any>;
  type Callback<T> = (error: unknown, value?: T) => void;
  interface Operation<This, Args extends unknown[], T> {
    (this: This, ...args: Args): Handler<T>;
    sync(this: This, ...args: Args): T;
    async(this: This, ...args: Args): Promise<T>;
    errback(this: This, ...args: [...Args, Callback<T>]): void;
  }
  type Options<This, Args extends unknown[], T> = {
    sync(this: This, ...args: Args): T;
    name?: string;
    arity?: number;
  } & (
    | { async?(this: This, ...args: Args): PromiseLike<T>; errback?: never }
    | {
        async?: never;
        errback(this: This, ...args: [...Args, Callback<T>]): void;
      }
  );
  function all<T>(tasks: Iterable<Handler<T>>): Handler<T[]>;
  function race<T>(tasks: Iterable<Handler<T>>): Handler<T>;
}
declare function gensync<This, Args extends unknown[], T>(
  source:
    | gensync.Options<This, Args, T>
    | ((this: This, ...args: Args) => gensync.Handler<T>),
): gensync.Operation<This, Args, T>;
export = gensync;
