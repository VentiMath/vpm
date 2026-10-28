/** Invoke the callback at most once; subsequent calls return its cached result. */
declare function once<F extends (this: any, ...args: any[]) => any>(callback: F): once.Wrapped<F>;
declare namespace once {
  type Callback = (this: any, ...args: any[]) => any;
  type Metadata<F> = Omit<F, 'called' | 'value' | 'onceError' | 'name' | 'length' | 'prototype'>;
  /** A synchronous throw or reentrant call before completion leaves value undefined. */
  type Wrapped<F extends Callback> = ((this: ThisParameterType<F>, ...args: Parameters<F>) => ReturnType<F> | undefined) & Metadata<F> & {
    readonly called: boolean;
    readonly value: ReturnType<F> | undefined;
  };
  type StrictWrapped<F extends Callback> = ((this: ThisParameterType<F>, ...args: Parameters<F>) => ReturnType<F>) & Metadata<F> & {
    readonly called: boolean;
    readonly value: ReturnType<F> | undefined;
    readonly onceError: string;
  };
  function strict<F extends Callback>(callback: F): StrictWrapped<F>;
  /** Opt-in legacy prototype methods; never installed merely by importing. */
  function proto(): void;
  /** Explicit annotation for a callback after proto(); no global type pollution. */
  type WithPrototype<F extends Callback> = F & {
    once(): Wrapped<F>;
    onceStrict(): StrictWrapped<F>;
  };
}
export = once;
