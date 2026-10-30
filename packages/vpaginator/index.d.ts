export interface AbortSignalLike {
  readonly aborted: boolean;
  readonly reason?: any;
  addEventListener(type: string, listener: (...args: any[]) => void, options?: any): void;
  removeEventListener(type: string, listener: (...args: any[]) => void, options?: any): void;
}
export interface StreamOptions {
  highWaterMark?: number;
  readableHighWaterMark?: number;
  writableHighWaterMark?: number;
  autoDestroy?: boolean;
  emitClose?: boolean;
  allowHalfOpen?: boolean;
  signal?: AbortSignalLike;
}
export type PageCallback<T = any> = (error: Error | null, results?: T[], nextQuery?: any, ...response: any[]) => void;
export type PageRequest<T = any> = (query: any, callback: PageCallback<T>) => unknown;
export interface ParsedArguments<T = any> {
  query?: any;
  callback?: PageCallback<T>;
  autoPaginate?: boolean;
  /** Nonnegative safe integer; -1 or undefined means unlimited. */
  maxApiCalls?: number;
  /** Nonnegative safe integer; -1 or undefined means unlimited. */
  maxResults?: number;
  streamOptions?: StreamOptions;
}
export class Paginator {
  extend(Class: Function, methodNames: string | string[]): void;
  streamify<T = any>(methodName: string): (this: any, ...args: any[]) => ResourceStream<T>;
  parseArguments_<T = any>(args: any[]): ParsedArguments<T>;
  /** Manual mode retains the original method's return type; automatic mode returns a promise or invokes the callback. */
  run_<T = any>(args: ParsedArguments<T>, originalMethod: PageRequest<T>): any;
  runAsStream_<T = any>(args: ParsedArguments<T>, originalMethod: PageRequest<T>): ResourceStream<T>;
}
export const paginator: Paginator;
export class ResourceStream<T = any> implements AsyncIterable<T> {
  constructor(args: ParsedArguments<T>, requestFn: PageRequest<T>);
  readonly _otherArgs: any[];
  _read(size?: number): void;
  read(size?: number): T | null;
  push(value: T | null, encoding?: string): boolean;
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
  destroy(error?: Error): this;
  end(callback?: () => void): this;
  end(chunk: any, callback?: () => void): this;
  end(chunk: any, encoding?: string, callback?: () => void): this;
  write(chunk: any, callback?: (error?: Error | null) => void): boolean;
  write(chunk: any, encoding?: string, callback?: (error?: Error | null) => void): boolean;
  pause(): this;
  resume(): this;
  isPaused(): boolean;
  setEncoding(encoding: string): this;
  pipe<D>(destination: D, options?: {end?: boolean}): D;
  unpipe(destination?: any): this;
  unshift(chunk: any, encoding?: string): void;
  wrap(stream: any): this;
  on(event: 'data', listener: (item: T) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
  prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string | symbol): this;
  emit(event: string | symbol, ...args: any[]): boolean;
  listenerCount(event: string | symbol, listener?: (...args: any[]) => void): number;
  listeners(event: string | symbol): ((...args: any[]) => void)[];
  rawListeners(event: string | symbol): ((...args: any[]) => void)[];
  eventNames(): (string | symbol)[];
  setMaxListeners(count: number): this;
  getMaxListeners(): number;
  readonly readable: boolean;
  readonly readableEnded: boolean;
  readonly readableLength: number;
  readonly readableHighWaterMark: number;
  readonly readableObjectMode: boolean;
  readonly writable: boolean;
  readonly writableEnded: boolean;
  readonly writableFinished: boolean;
  readonly writableLength: number;
  readonly writableHighWaterMark: number;
  readonly writableObjectMode: boolean;
  readonly writableNeedDrain: boolean;
  readonly destroyed: boolean;
  readonly closed: boolean;
  readonly errored: Error | null;
}
