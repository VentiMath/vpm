export interface PromisifyOptions {singular?: boolean;}
export interface PromisifyAllOptions extends PromisifyOptions {exclude?: string[];}
export interface CallbackifyAllOptions {exclude?: string[];}
export interface PromiseMethod extends Function {promisified_?: boolean;}
export interface CallbackMethod extends Function {callbackified_?: boolean;}
export interface WithPromise {Promise?: PromiseConstructor;}
export type AnyFunction = (this: any, ...args: any[]) => any;
export type WithoutCallback<A extends any[]> = A extends [...infer P, any?] ? P : A;
export type CallbackValues<F extends AnyFunction> = Required<Parameters<F>> extends [...any[], infer C]
  ? C extends (...args: infer A) => any ? A extends [any, ...infer V] ? V : any[] : any[] : any[];
export type Singular<V extends any[]> = V extends [infer T] ? T : V;
export type CallbackModeArguments<F extends AnyFunction> = Required<Parameters<F>> extends [...any[], infer C] ? [...WithoutCallback<Parameters<F>>, C] : Parameters<F>;
export type Promisified<F extends AnyFunction, S extends boolean = false> = {
  (this: ThisParameterType<F>, ...args: WithoutCallback<Parameters<F>>): Promise<S extends true ? Singular<CallbackValues<F>> : CallbackValues<F>>;
  (this: ThisParameterType<F>, ...args: CallbackModeArguments<F>): ReturnType<F>;
  call(receiver: ThisParameterType<F>, ...args: WithoutCallback<Parameters<F>>): Promise<S extends true ? Singular<CallbackValues<F>> : CallbackValues<F>>;
  call(receiver: ThisParameterType<F>, ...args: CallbackModeArguments<F>): ReturnType<F>;
  promisified_: true;
};
export declare function promisify<F extends AnyFunction>(original: F, options: PromisifyOptions & {singular:true}): Promisified<F,true>;
export declare function promisify<F extends AnyFunction>(original: F, options?: PromisifyOptions & {singular?:false}): Promisified<F>;
export declare function promisify<F extends AnyFunction>(original: F, options: PromisifyOptions): Promisified<F,boolean>;
/** Broad upstream Function declarations retain their original dynamic typing. */
export declare function promisify(original: PromiseMethod, options?: PromisifyOptions): any;
export declare function promisifyAll(Class: Function, options?: PromisifyAllOptions): void;
export type ResolvedValues<F extends AnyFunction> = Awaited<ReturnType<F>> extends readonly any[] ? Awaited<ReturnType<F>> : [Awaited<ReturnType<F>>];
export type Callbackified<F extends AnyFunction> = F & {
  (this: ThisParameterType<F>, ...args: [...Parameters<F>, (error: any, ...results: ResolvedValues<F>) => void]): void;
  callbackified_: true;
};
export declare function callbackify<F extends AnyFunction>(original: F): Callbackified<F>;
export declare function callbackify(original: CallbackMethod): CallbackMethod;
export declare function callbackifyAll(Class: Function, options?: CallbackifyAllOptions): void;
