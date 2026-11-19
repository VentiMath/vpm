type Fn = (this: any, ...args: any[]) => any;
export type LegacyMethodDecorator = <F extends Fn>(target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<F>) => TypedPropertyDescriptor<F> | void;
export interface MemoizeOptions { caseSensitive?: boolean; cache?: Record<string, unknown>; }
export interface DebounceOptions { delay?: number; }
export function bind<F extends Fn>(fn: F, context: ThisParameterType<F>): OmitThisParameter<F>;
export function bind<F extends Fn>(target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<F>): TypedPropertyDescriptor<F>;
export function bind(): LegacyMethodDecorator;
export function memoize<F extends Fn>(fn: F, options?: MemoizeOptions): F;
export function memoize<F extends Fn>(target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<F>): void;
export function memoize(options?: MemoizeOptions): LegacyMethodDecorator;
export function debounce<F extends Fn>(fn: F, delay?: number | DebounceOptions): (this: ThisParameterType<F>, ...args: Parameters<F>) => void;
export function debounce<F extends Fn>(delay: number | DebounceOptions, fn: F): (this: ThisParameterType<F>, ...args: Parameters<F>) => void;
export function debounce<F extends Fn>(target: object, key: string | symbol, descriptor: TypedPropertyDescriptor<F>): void;
export function debounce(delay?: number | DebounceOptions): LegacyMethodDecorator;
declare const decko: {bind: typeof bind; memoize: typeof memoize; debounce: typeof debounce};
export default decko;
